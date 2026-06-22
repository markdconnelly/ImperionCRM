-- 0183: agent_event dead-letter + replay audit — production-hardening the wake-event substrate
-- (#1000, 1D of epic #991/#997, per ADR-0111). Builds on 0164 (agent_event inbox) + 0181
-- (agent_subscription predicate fan-out) + the #999/#357 eventKey idempotency.
-- Migration number 0183 claimed at MERGE per system CLAUDE.md §10.3 — 0182 was the highest on
-- origin/main at rebase. RENUMBER AT MERGE if another session lands a lower-numbered migration
-- first: rebase on current main, rename this file + this header to the next free number, squash.
--
-- WHY THIS EXISTS. 0164 already carries the DLQ *status* (a failing event walks
-- pending → deferred → dead once attempts exhaust) and the original event is preserved IN PLACE
-- (the dead row keeps its event_type / idempotency_key / source / subject / payload — by contract
-- id/routing-only, no client_pii). So the "dead-letter, original preserved" AC is structural.
-- What 1D adds is the OPERATOR contract on top of that stub:
--   1. dead_lettered_at — WHEN a row crossed into the DLQ, so the observability surface can show
--      DLQ age, not just depth, and so replay can clear a clean marker.
--   2. replayed_at / replayed_by — the AUDIT of an admin replay: a dead row that an operator
--      re-injects is stamped with who re-drove it and when. Replay does NOT delete or copy the
--      row — it re-pends THE SAME row (status='pending', attempts reset, errors cleared), so the
--      original event, its idempotency_key, and its history all stay on one durable row. This is
--      why replay is idempotent end-to-end: the re-driven event keeps producing the SAME
--      eventKey '<event_id>:<workflow>' per matched subscription, and the backend's
--      findRunByEventKey guard (#299/#357) REUSES any run a prior dispatch already opened rather
--      than opening a duplicate. A replay therefore only opens runs for (event, workflow) pairs
--      that never succeeded — gap-free, no double-actuation.
--
-- THE DLQ RECORD SHAPE (defined ONCE here, mirrored in the backend replay endpoint + the FE
-- reader). A dead-lettered event = an `agent_event` row with status='dead'. Its fields:
--   id, event_type, idempotency_key, source, tenant_id, subject, payload  (the ORIGINAL event,
--     untouched from emit — this is the "original event preserved" guarantee),
--   attempts, last_error            (why it died — diagnostics, never a secret),
--   dead_lettered_at                (NEW — when it died),
--   replayed_at, replayed_by        (NEW — the replay audit, null until an admin replays it).
-- Replay transition (backend-owned, BE replay endpoint): a row with status='dead' →
--   status='pending', attempts=0, last_error=NULL, claimed_at=NULL, dispatched_at=NULL,
--   dead_lettered_at=NULL, replayed_at=now(), replayed_by=<admin app_user.id>.
--
-- Archetype H (governance/control), horizontal Audit/governance domain — additive columns on the
-- existing agent_event control-plane table (twin of agent_run / agent_subscription /
-- agent_governance_setting, 0163/0164/0181). App-native control plane; NOT silver, NOT
-- pipeline-merged → no OKF concept file in the silver sense (semantic-layer-not-affected, the
-- 0154/0158/0163/0164/0181 precedent). Frontend-owned schema (ADR-0042). The columns hold
-- timestamps + an app_user id — no client_pii, no secrets. Additive, idempotent, transactional.
-- NOT prod-applied until Mark runs it (each prod apply is Mark-gated, §10.3).

BEGIN;

-- ── DLQ + replay audit columns on the existing inbox ────────────────────────────────────────
-- All additive + IF NOT EXISTS → idempotent re-run. The original event columns are untouched.
ALTER TABLE agent_event
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz,
  ADD COLUMN IF NOT EXISTS replayed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS replayed_by      uuid REFERENCES app_user(id);

COMMENT ON COLUMN agent_event.dead_lettered_at IS
  'When this event crossed into the DLQ (status=dead, attempts exhausted) — #1000. Null while live; cleared on admin replay. Powers DLQ age in the observability surface.';
COMMENT ON COLUMN agent_event.replayed_at IS
  'When an admin re-injected this dead-lettered event through the dispatch path (#1000). The row itself is re-pended (status=pending, attempts reset) — never copied/deleted — so the original event + idempotency_key persist. Idempotency holds via the eventKey guard (#299/#357).';
COMMENT ON COLUMN agent_event.replayed_by IS
  'The admin app_user.id who replayed this dead-lettered event (#1000 audit). Null until replayed.';

-- The DLQ surface's hot path: "the dead rows, newest-dead first" + the depth count. Partial
-- index on the dead status keeps it tight as dispatched rows accumulate.
CREATE INDEX IF NOT EXISTS idx_agent_event_dead
  ON agent_event (dead_lettered_at DESC) WHERE status = 'dead';

-- ── Grant note: 0164 already granted the web role SELECT (observability) and the backend role
--    SELECT/INSERT/UPDATE (the dispatcher claims/stamps; replay is an UPDATE on the dead row).
--    The new columns inherit the table grants — no new GRANT needed. (Re-asserted defensively for
--    a fresh DB where 0164's grants may not yet exist.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON agent_event TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON agent_event TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
