-- 0152: persist the caller's raw Entra group object-ids on `app_user` (#974, parent
-- #967, ADR-00XX two-axis RLS). Migration number 0152 claimed at MERGE per system
-- CLAUDE.md §10.3 — authored against a placeholder; the rebased branch takes the next
-- free number just before squash. ADR number is likewise a placeholder until merge.
--
-- WHY THIS EXISTS. The access spine enforces two-axis RLS: personal/owner scope keyed on
-- the Entra `oid` claim, company/role scope keyed on the caller's group membership. The
-- normalized app roles already live in `app_user.roles` (a lossy projection), but the
-- raw Entra group object-ids are the authoritative membership record — needed for audit,
-- the admin god-view, and to resolve the company axis precisely later. Slice 1 (#974)
-- captures them on sign-in; no RLS policy reads this column yet (slices 2/3, #975/#976).
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT —
-- NOT prod-applied until the orchestrator/Mark runs it (each prod apply is Mark-gated).
-- No secrets; no row-level PII (group object-ids are non-secret directory identifiers).

BEGIN;

ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS group_ids text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN app_user.group_ids IS
  'Raw Entra group object-ids from the sign-in token (groups/roles claim). '
  'Authoritative membership for two-axis RLS company scope (#967). '
  'Distinct from app_user.roles (the normalized app-role projection).';

COMMIT;
