-- 0144: make `cloud` a first-class Configuration Item in the CMDB curated layer
-- (#653, parent #372, ADR-0078/0097/0047).
-- Migration number 0144 claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before
-- squash. If another migration merges during the CI window, renumber this file.
--
-- WHY THIS EXISTS. The cloud CI type (silver `cloud_asset`, #874/#875) is already a
-- first-class member of the read-only `cmdb_ci` union, the register filter, the detail
-- route, and the in-code criticality/lifecycle rules. But the two PERSISTED curated-layer
-- tables predate it and still CHECK-restrict the CI type to `account|user|device`:
--   * `ci_relationship` (0131) — so a cloud→account edge cannot be stored (the derivation
--     would violate the CHECK), leaving cloud CIs with no relationships and an empty impact
--     neighbourhood.
--   * `cmdb_ci_overlay` (0132) — so `crm.setCiCriticalityOverride('cloud', …)` (offered by
--     the live detail page) throws, and `crm.deriveCiCriticality()` never persists a cloud
--     derived_default. Cloud criticality currently works ONLY via the in-code fallback.
-- This migration widens both CHECKs to include `cloud` and seeds the cloud rows, completing
-- cloud as a first-class CI in the relationship + criticality overlay.
--
-- NOT IN SCOPE (deliberate):
--   * cloud→device / cloud→service edges — silver `cloud_asset` carries no device/service
--     FK today (only `account_id`), so that derivation is OMITTED rather than fabricated,
--     exactly as 0131 omitted device→assigned-user. It lands if/when a cloud↔device link is
--     modelled in silver (a future front-end schema change, ADR-0042). Manual edges
--     (cmdb:write) can assert one in the meantime.
--   * `change_request.ci_type` (0135) still CHECK-restricts to `account|user|device`; that
--     is the ITIL change epic (#373), tracked as its own follow-up issue, not this slice.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it. No secrets; no row-level PII (an edge is
-- two CI business keys + a relation type; an overlay row is a CI key + a criticality enum).

BEGIN;

-- ── Widen the CI-type CHECKs to admit `cloud` ───────────────────────────────────────────
-- Drop-then-add (names are the Postgres defaults, confirmed in prod). Widening a CHECK never
-- fails validation against existing rows. Re-runnable: DROP IF EXISTS + ADD.
ALTER TABLE ci_relationship DROP CONSTRAINT IF EXISTS ci_relationship_from_ci_type_check;
ALTER TABLE ci_relationship
  ADD CONSTRAINT ci_relationship_from_ci_type_check
  CHECK (from_ci_type IN ('account', 'user', 'device', 'cloud'));
ALTER TABLE ci_relationship DROP CONSTRAINT IF EXISTS ci_relationship_to_ci_type_check;
ALTER TABLE ci_relationship
  ADD CONSTRAINT ci_relationship_to_ci_type_check
  CHECK (to_ci_type IN ('account', 'user', 'device', 'cloud'));

ALTER TABLE cmdb_ci_overlay DROP CONSTRAINT IF EXISTS cmdb_ci_overlay_ci_type_check;
ALTER TABLE cmdb_ci_overlay
  ADD CONSTRAINT cmdb_ci_overlay_ci_type_check
  CHECK (ci_type IN ('account', 'user', 'device', 'cloud'));

-- ── Seed the cloud derived edges + overlay (the same recompute the repository runs) ───────
-- Re-runnable and manual-safe: this only adds derived rows (ON CONFLICT) — manual edges and
-- admin overrides are never touched.

-- cloud belongs-to account (cloud_asset.account_id)
INSERT INTO ci_relationship
  (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
SELECT 'cloud', ca.id::text, 'account', ca.account_id::text, 'belongs-to', 'derived'
  FROM cloud_asset ca
 WHERE ca.account_id IS NOT NULL
ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
DO NOTHING;

-- cloud derived_default criticality from category (mirrors deriveCloudCriticality in
-- src/lib/cmdb/criticality.ts: database/identity/security → high; compute/network → medium;
-- else low — `critical` is never auto-derived, admin override only).
INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
SELECT 'cloud', ca.id::text,
       (CASE
          WHEN ca.category::text IN ('database', 'identity', 'security') THEN 'high'
          WHEN ca.category::text IN ('compute', 'network') THEN 'medium'
          ELSE 'low'
        END)::ci_criticality
  FROM cloud_asset ca
 WHERE ca.account_id IS NOT NULL
ON CONFLICT (ci_type, ci_id)
DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now();

COMMIT;
