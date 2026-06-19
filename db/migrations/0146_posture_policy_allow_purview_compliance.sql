-- 0146: widen posture_policy.policy_family CHECK to admit `purview_compliance` (#687,
-- ADR-0051 §3 / ADR-0019).
-- Migration number 0146 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash. If another
-- migration merges during the review window, renumber this file.
--
-- WHY THIS EXISTS. The on-prem Purview compliance collector (LP #196, ADR-0019, LP PR #208)
-- writes bronze `purview_compliance_policies` / `purview_compliance_golden` (migration 0119)
-- and runs drift, but is HELD OUT of the silver `posture_policy` write because
-- `posture_policy.policy_family` CHECK-restricts the family to the original five
-- (`conditional_access`, `intune_security`, `device_configuration`, `autopilot`,
-- `defender_xdr`). This widens the CHECK to admit `purview_compliance` as a SIXTH family so
-- the LP posture-merge can flip Purview to silver (the LP side already carries the `Silver`
-- flag seam). The five existing families are untouched.
--
-- Drop-then-add the Postgres-default constraint name (confirmed in prod:
-- `posture_policy_policy_family_check`). Widening a CHECK never fails validation against
-- existing rows. Re-runnable: DROP IF EXISTS + ADD.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it. No secrets; no row-level PII (a drift
-- verdict is a tenant id + family + policy id + hashes; specific values stay out of git).

BEGIN;

ALTER TABLE posture_policy DROP CONSTRAINT IF EXISTS posture_policy_policy_family_check;
ALTER TABLE posture_policy
  ADD CONSTRAINT posture_policy_policy_family_check
  CHECK (policy_family IN
    ('conditional_access', 'intune_security', 'device_configuration', 'autopilot',
     'defender_xdr', 'purview_compliance'));

COMMIT;
