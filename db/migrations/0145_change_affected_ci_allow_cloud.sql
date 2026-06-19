-- 0145: allow `cloud` in change_affected_ci.ci_type CHECK (#925, parent #373, ADR-0079).
-- Migration number 0145 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash. If another
-- migration merges during the review window, renumber this file.
--
-- WHY THIS EXISTS. `cloud` is now a first-class CMDB Configuration Item (#653 — migration 0144
-- widened the two persisted curated-layer tables, `ci_relationship` (0131) and
-- `cmdb_ci_overlay` (0132), to admit it). The THIRD curated-layer table that carries a
-- polymorphic CI endpoint — `change_affected_ci.ci_type` (0135) — was left out of 0144 on
-- purpose (its "NOT IN SCOPE" note → this issue, the ITIL change epic #373 / ADR-0079). So an
-- ITIL change_request still cannot list a `cloud_asset` CI as affected, even though the app
-- ALREADY accepts it: `filterValidCis` validates against the `cmdb_ci` union (which includes
-- cloud) and the `CiType` type admits `cloud`. The only remaining gap is this DB CHECK.
--
-- This closes the cloud-CI CHECK gap consistently across all three curated-layer tables.
--
-- Drop-then-add the Postgres-default constraint name (confirmed in prod:
-- `change_affected_ci_ci_type_check`). Widening a CHECK never fails validation against
-- existing rows. Re-runnable: DROP IF EXISTS + ADD. Mirrors the 0144 pattern.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it. No secrets; no row-level PII (an affected-CI
-- link is two CI business keys + a change FK).

BEGIN;

ALTER TABLE change_affected_ci DROP CONSTRAINT IF EXISTS change_affected_ci_ci_type_check;
ALTER TABLE change_affected_ci
  ADD CONSTRAINT change_affected_ci_ci_type_check
  CHECK (ci_type IN ('account', 'user', 'device', 'cloud'));

COMMIT;
