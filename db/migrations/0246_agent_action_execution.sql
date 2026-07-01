-- 0246: agent_action_execution — the per-action idempotency ledger (#1793; unblocks
-- backend #496, gauntlet gate 9).
--
-- WHY THIS EXISTS. Gauntlet gate 9 (idempotency) is a stub in the backend: there is no
-- durable ledger to detect that an autonomous (unattended) action has ALREADY committed.
-- An autonomous retry of a send/write can execute twice (double-message / double-bill),
-- and the markStepExecuted status flip is not atomic with the outbound effect — a crash
-- mid-send leaves a step `approved` with the send already gone, so a retry re-dispatches.
-- Backend recon (2026-07-01) confirmed no idempotency/dedup ledger exists in the shared
-- DB: the event inbox UNIQUE idempotency_key is wake-dedup only, and the Autotask
-- bronze-envelope marker is source-specific. Per the four-repo contract (§1 / ADR-0042)
-- the schema is FE-owned, so this table lands here; the backend is the consumer.
--
-- CONSUMER CONTRACT (BE #496, gate 9). The backend derives `idempotency_key`
-- deterministically from the action (e.g. hash(kind, contactId, channel, body) for
-- send_email/send_sms; social replies key off the external ref). Before an autonomous
-- commit, gate 9 resolves probes.alreadyCommitted by looking the key up. On execute the
-- backend INSERTs the marker BEFORE the outbound effect (claim-before-send) — the UNIQUE
-- on idempotency_key makes the claim atomic: a concurrent/retry INSERT conflicts, sees
-- the prior row, and replays the recorded `result` instead of re-sending. `result` is
-- UPDATEd after the send returns (e.g. { "interaction_id": ... }).
--
-- Migration number 0246 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against a placeholder; the rebased branch takes the next free number just
-- before squash, fixing this header + the data-model.md/schema-guide.md references.
--
-- ARCHETYPE: operational agent-runtime ledger (archetype H twin of agent_run /
-- agent_pending_action, the 0158/0163 precedent) — NOT a curated silver business entity,
-- so no OKF concept file (semantic-layer-not-affected). Append-only: rows are never
-- deleted (no DELETE grant to anyone); FKs carry no ON DELETE action because agent_run /
-- agent_pending_action are themselves append-only ledgers (ADR-0080). No PII, no
-- secrets: idempotency_key is a derived hash, provenance columns are ids, `result`
-- carries result ids only (never a message body or credential). Additive, idempotent,
-- transactional. NOT prod-applied until Mark gates the apply (§10.3).

BEGIN;

CREATE TABLE IF NOT EXISTS agent_action_execution (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The dedup key, derived by the BACKEND from the action's identity (e.g.
  -- hash(kind, contactId, channel, body)). UNIQUE is the whole mechanism: the
  -- claim-before-send INSERT races safely on this constraint.
  idempotency_key   text NOT NULL UNIQUE,
  -- Provenance links into the run ledger / approval cockpit (ADR-0080/0109). Nullable:
  -- an execution can be claimed outside a cockpit item (direct autonomous dispatch).
  run_id            uuid REFERENCES agent_run(id),
  pending_action_id uuid REFERENCES agent_pending_action(id),
  -- The action-catalog kind that executed (send_email, send_sms, social_reply, ...).
  kind              text NOT NULL,
  executed_at       timestamptz NOT NULL DEFAULT now(),
  -- Recorded outcome, replayed to a retry instead of re-sending (e.g.
  -- {"interaction_id": "..."}). Ids only — never a drafted body, never a credential.
  result            jsonb
);

COMMENT ON TABLE agent_action_execution IS
  'Per-action idempotency ledger (#1793; consumer = backend gauntlet gate 9, BE #496). One row per committed autonomous action, keyed by a backend-derived idempotency_key; INSERTed claim-before-send so the UNIQUE makes the outbound commit atomic and a retry replays `result` instead of re-executing. Append-only (no DELETE); backend RW, web SELECT. No PII, no secrets.';
COMMENT ON COLUMN agent_action_execution.idempotency_key IS
  'Backend-derived dedup key for the action, e.g. hash(kind, contactId, channel, body); social replies key off the external ref. UNIQUE = the atomic claim.';
COMMENT ON COLUMN agent_action_execution.run_id IS
  'The agent_run whose step committed this action (ledger provenance, ADR-0080). Nullable.';
COMMENT ON COLUMN agent_action_execution.pending_action_id IS
  'The approval-cockpit item (agent_pending_action) this execution fulfilled, when one exists (ADR-0109). Nullable for direct autonomous dispatch.';
COMMENT ON COLUMN agent_action_execution.kind IS
  'Action-catalog kind that executed (send_email, send_sms, social_reply, ...). Mirrors agent_pending_action.action_kind.';
COMMENT ON COLUMN agent_action_execution.result IS
  'Recorded outcome replayed to a deduped retry (e.g. {"interaction_id": ...}). Result ids only — never message bodies, never credentials.';

-- The UNIQUE constraint gives idempotency_key its index (the gate-9 lookup path).
-- Provenance lookups ("what did this run commit?") hit run_id, like the other
-- agent_run correlation FKs (idx_agent_run_conversation, 0163 / idx_agent_run_parent, 0245).
CREATE INDEX IF NOT EXISTS idx_agent_action_execution_run
  ON agent_action_execution (run_id);

-- ── Grants (least-priv, ADR-0127; defensive role checks, the 0158/0163/0241 pattern) ────────
-- Backend = the ONLY writer: INSERT the claim, UPDATE the result after the send returns.
-- Web = SELECT only (run-ledger / cockpit observability). Pipelines get NOTHING — this is
-- agent-runtime plane, not an ingestion/merge surface. NOBODY gets DELETE: the ledger is
-- append-only; deleting a row would re-arm a double-send.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON agent_action_execution TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend RW grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON agent_action_execution TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
END $$;

COMMIT;
