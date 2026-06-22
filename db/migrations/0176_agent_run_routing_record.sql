-- 0176: Record the actuation dial decision on the run ledger (#996 / 2E, ADR-0107 D4/D5, ADR-0109).
-- Migration number 0176 is a PLACEHOLDER — RENUMBER AT MERGE per system CLAUDE.md §10.3
-- (rebase on current main, take the next free number, rename + fix references, then squash).
--
-- WHY THIS EXISTS. The 1–5 actuation dial (agent_action_autonomy, 0158) resolves a proposed
-- action's ADR-0055 tier against a level → tier-ceiling and ROUTES it: execute inline /
-- execute + notify (L4) / route to the approval cockpit (agent_pending_action). Issue #996's
-- acceptance requires the resolved level, ceiling, and routing decision to be recorded on the
-- RUN so the glass-box trace shows *why* an action executed silently vs. parked for a human.
--
-- agent_pending_action already records resolved_level / resolved_ceiling for the actions that
-- PARK (0158). This adds the same record to agent_run for the actions that EXECUTE inline
-- (L3–L5) — so every dispatch, routed or not, is auditable from the run, closing the
-- "recorded on agent_run" criterion. ADR-0109 Context noted the CRM orchestrator wasn't on
-- agent_run yet; the Jarvis ledger (0163) put it there, so the columns now have a writer.
--
-- The BACKEND dispatcher (BE #250, the authoritative runtime, ADR-0042) writes these at
-- dispatch using the SAME pure resolution the front end expresses in
-- src/lib/agent/action-dispatch.ts (resolveDispatch); the front-end run-trace surface reads
-- them. The web role gets SELECT only (it renders the trace; it never dispatches).
--
-- Archetype H (governance/control), horizontal Audit/governance domain — twin of the
-- agent_pending_action routing columns (0158). App-native; NOT silver, NOT pipeline-merged →
-- no OKF concept file (semantic-layer-not-affected, the 0158/0163 precedent). Frontend-owned
-- schema (ADR-0042). No PII, no secrets. Additive, idempotent, transactional. NOT prod-applied
-- until merge — each prod apply is Mark-gated (§10.3).

BEGIN;

-- The 1–5 level that applied to this run's dispatch (the most-specific agent_action_autonomy
-- row). NULL = no governed action dispatched on this run (a read-only / pure-reasoning run).
ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS resolved_level smallint
  CHECK (resolved_level IS NULL OR resolved_level BETWEEN 1 AND 5);
COMMENT ON COLUMN agent_run.resolved_level IS
  'The 1–5 actuation autonomy level that applied to this run''s dispatched action (agent_action_autonomy, ADR-0109). NULL = no governed action dispatched. Recorded by the backend dispatcher (BE #250); rendered on the glass-box trace.';

-- The ADR-0055 tier ceiling that level resolved to (T0–T3).
ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS resolved_ceiling text
  CHECK (resolved_ceiling IS NULL OR resolved_ceiling IN ('T0','T1','T2','T3'));
COMMENT ON COLUMN agent_run.resolved_ceiling IS
  'The ADR-0055 tier ceiling the resolved_level mapped to (T0–T3, ADR-0107 D4). The action''s own tier above this routes it to the cockpit; at/below it executes inline.';

-- The routing decision the dial produced for this run's action.
ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS route_decision text
  CHECK (route_decision IS NULL OR route_decision IN ('execute','execute_notify','cockpit'));
COMMENT ON COLUMN agent_run.route_decision IS
  'The actuation-dial routing decision for this run''s dispatched action (ADR-0107 D4/D5): execute (≤ ceiling) | execute_notify (L4 oversight: execute + notify + undo window) | cockpit (> ceiling: parked on agent_pending_action for human approval). Mirrors src/lib/agent/action-dispatch.ts resolveDispatch.';

-- Grants: the backend (dispatcher) writes these; the web role reads them for the run trace.
-- agent_run already carries grants (0056); ALTER ... ADD COLUMN inherits the table grants, so
-- no GRANT is required here. Left documented for the reader; no-op block kept out to avoid
-- re-asserting grants the table already has.

COMMIT;
