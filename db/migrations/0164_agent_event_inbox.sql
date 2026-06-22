-- 0164: agent_event — the durable wake-event inbox (#998, 1B of epic #991/#997).
-- Migration number 0164 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY THIS EXISTS. The AI-Technician wedge needs ONE real business event
-- (autotask.ticket.created) to flow end-to-end to a wakened agent run. The settled
-- transport (PL #152 wake-contract, folded into the #997 substrate ADR) is a durable
-- DB inbox, NOT a bus: the cloud Pipeline writes one row per event, a backend dispatcher
-- drains pending rows on a short timer (the first reactive surface) and opens an
-- agent_run via the ADR-0073 producer. Rationale: the backend is 100% pull today
-- (zero queue/event triggers) and the ICM executor already poll-drains pending runs, so
-- a wake is just a NEW PRODUCER — minimal surface, no new cross-app auth, idempotent and
-- replayable by construction. This decision does NOT pre-empt the Mark-gated bus choice
-- in #997: when a bus is later picked (reconciled w/ Pipeline ADR-0003), it becomes a
-- FEEDER that inserts into / notifies this same inbox — the dispatcher contract is
-- unchanged.
--
-- SCOPE. This migration delivers ONLY the inbox table. The subscription table
-- (agent_subscription: event_type + predicate → workflow_key + acting_identity + autonomy)
-- is deferred to #999 (1C predicate fan-out); v1 HARDCODES the single
-- autotask.ticket.created → technician mapping in the backend dispatcher. DLQ admin replay
-- is #1000 (1D); this table carries the status lifecycle + attempts/last_error those layers
-- build on, but no replay machinery here.
--
-- CONTAINMENT (folds in #997 decision-3 / #1033). Idempotency is the UNIQUE
-- idempotency_key (a redelivered webhook → ON CONFLICT DO NOTHING → at most one row → at
-- most one run). Loop-prevention is structural upstream (Pipeline wakes on `created` only;
-- an agent's own ticket writes are updates/notes, never `created`). Rate / fan-out caps live
-- on the dispatcher (WAKE_MAX_RUNS_PER_TICK) + the agent_governance_setting caps (0163), not
-- in this schema.
--
-- Archetype H (governance/control), horizontal Audit/governance domain — a twin of
-- agent_run / agent_pending_action / agent_governance_setting (0163). App-native control
-- plane; NOT silver, NOT pipeline-merged → no OKF concept file
-- (semantic-layer-not-affected, the 0154/0158/0163 precedent). Frontend-owned schema
-- (ADR-0042). Payload is id/routing-only by contract (no ticket body) — no client_pii, no
-- secrets. Additive, idempotent, transactional. NOT prod-applied until Mark runs it (each
-- prod apply is Mark-gated, §10.3).

BEGIN;

-- ── agent_event: the durable wake-event inbox ──────────────────────────────────────────────
-- One row per emitted business event. The Pipeline INSERTs (status='pending'); the backend
-- dispatcher claims pending rows (FOR UPDATE SKIP LOCKED), opens an agent_run, and stamps
-- run_id + status='dispatched'. The row is the source of truth: it survives backend downtime
-- and is replayable.
CREATE TABLE IF NOT EXISTS agent_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Dotted event type, e.g. 'autotask.ticket.created'. The (hardcoded, v1) subscription maps
  -- this to a workflow_key; #999 generalizes to a predicate table.
  event_type      text NOT NULL,
  -- Dedup key, e.g. 'autotask:ticket:{id}:created'. UNIQUE → a redelivered event is a no-op
  -- (ON CONFLICT DO NOTHING on the producer side) → at most one wake. The idempotency AC.
  idempotency_key text NOT NULL UNIQUE,
  -- Producer provenance, e.g. 'pipeline:webhook:autotask'.
  source          text NOT NULL,
  -- Home tenant the event belongs to (multi-tenant routing later).
  tenant_id       text,
  -- What the event is about: { entity, externalId, accountExternalId, ... }. Ids/routing only.
  subject         jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Routing fields the dispatcher needs (ticketId, accountId, queueId, priority, …). By
  -- contract MINIMAL — no ticket description/body. The agent re-reads fresh silver
  -- (freshness = correctness); keeps client_pii out of the inbox.
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Lifecycle: pending (just emitted) → claimed (dispatcher holds it) → dispatched (run opened)
  -- | deferred (back-pressured, retry next tick) | dead (exhausted attempts, DLQ #1000)
  -- | ignored (no matching subscription / loop-suppressed).
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','claimed','dispatched','deferred','dead','ignored')),
  -- The agent_run this event opened (null until dispatched). The forward half of the
  -- event→run correlation; agent_run carries conversation_id/run_id/step_id (0163).
  run_id          uuid REFERENCES agent_run(id),
  -- Dispatch attempt counter; the dispatcher trips status='dead' after the configured ceiling.
  attempts        int NOT NULL DEFAULT 0,
  -- Last dispatch failure (diagnostics for DLQ replay, #1000). Never a secret.
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  claimed_at      timestamptz,
  dispatched_at   timestamptz
);
COMMENT ON TABLE agent_event IS
  'Durable wake-event inbox (#998, 1B tracer of epic #991/#997). Pipeline INSERTs one row per business event (e.g. autotask.ticket.created); a backend dispatcher drains pending rows on a short timer, opens an agent_run, and stamps run_id+status. The row is the source of truth (durable/idempotent/replayable). A bus (#997, Mark-gated) later FEEDS this same inbox — dispatcher contract unchanged. Pipeline INSERT, backend RW, web SELECT. Payload is id/routing-only by contract (no client_pii); no secrets.';
COMMENT ON COLUMN agent_event.idempotency_key IS
  'Dedup key (e.g. autotask:ticket:{id}:created). UNIQUE — producer inserts ON CONFLICT DO NOTHING so a redelivered event opens at most one run (the idempotency AC, #998).';
COMMENT ON COLUMN agent_event.status IS
  'Lifecycle: pending → claimed → dispatched | deferred (back-pressured) | dead (DLQ, #1000) | ignored (no subscription / loop-suppressed).';
COMMENT ON COLUMN agent_event.payload IS
  'Routing fields only (ids + queue/priority) — NO ticket body. The agent re-reads fresh silver (freshness=correctness); keeps client_pii out of the inbox.';
COMMENT ON COLUMN agent_event.run_id IS
  'The agent_run this event opened (null until dispatched). Forward half of the event→run correlation (agent_run carries conversation_id/run_id/step_id, 0163).';

-- The dispatcher's hot path: claim the oldest pending rows. Partial index keeps it tight as
-- dispatched/dead rows accumulate.
CREATE INDEX IF NOT EXISTS idx_agent_event_status_created
  ON agent_event (status, created_at);

-- ── Grants: Pipeline writes (the producer), backend drains (the dispatcher), web reads
--    (the DLQ / event-observability surface, #1000). Mirrors the 0163 control-plane split.
--    Defensive: skip a role that is absent (non-prod / fresh DB).
DO $$
BEGIN
  -- Cloud Pipeline is the producer: inserts the event row; SELECT supports ON CONFLICT.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT ON agent_event TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grants.';
  END IF;
  -- Backend dispatcher claims/updates rows and stamps run_id; also a future producer.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON agent_event TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  -- Web reads for the event/run observability + DLQ surface (#1000).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON agent_event TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
END $$;

COMMIT;
