-- 0203 (PLACEHOLDER NUMBER — claimed at merge, §10.3): add the `writeback` action to the
-- `grounding_conflict_event` ledger (#1217, BE #365, ADR-0119).
--
-- WHY THIS EXISTS. Migration 0178 modeled the grounding-conflict ledger with four actions —
-- raise / resolve / dismiss / reassign. The resolution WRITE-BACK (ADR-0119 §"write-back
-- deferred") is now executed: when a domain owner resolves a conflict affirming a tier, the
-- backend pushes the authoritative correction to the system of record — canon (an okf-sync
-- issue, system CLAUDE.md §11) or company silver (a merge-correction directive, ADR-0042).
-- That execution is itself an accountable, append-only event, so it needs its own ledger
-- action. This widens the CHECK constraint to admit `writeback`; the event's PII-free `detail`
-- jsonb carries `{ tier, target, externalRef }` (the okf-sync issue URL or the silver-plane
-- directive ref) — never claim text, never PII (the 0178 ledger contract).
--
-- The backend role already holds INSERT on `grounding_conflict_event` (0178), so no new grant
-- is required — only the constraint is widened.
--
-- Idempotent: drops the old constraint if present and re-adds the widened one. Safe to re-run.

BEGIN;

ALTER TABLE grounding_conflict_event
  DROP CONSTRAINT IF EXISTS grounding_conflict_event_action_check;

ALTER TABLE grounding_conflict_event
  ADD CONSTRAINT grounding_conflict_event_action_check
  CHECK (action IN ('raise', 'resolve', 'dismiss', 'reassign', 'writeback'));

COMMIT;
