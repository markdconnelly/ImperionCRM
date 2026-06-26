-- 0204: silver `software_ci` + CMDB software CI type + device→software derived edges
-- (#652, parent #372, ADR-0078/0097; cloud_asset/cloud-CI precedent #874/#653/0144;
-- Intune managed-apps bronze #261/0148).
-- Migration number 0204 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- PLACEHOLDER; the rebased branch takes the next free number just before squash. If another
-- migration merges during the CI window, renumber this file + every reference.
--
-- WHY THIS EXISTS. The CMDB CI register (#645) recognises four CI types projected over silver
-- (account/user/device/cloud). #652 adds SOFTWARE as a first-class CI and wires the
-- `device runs software` relationship. The raw feed is the per-device Intune managed/detected
-- app inventory in BRONZE (`intune_managed_apps`, 0148) — but a CI must be a SILVER projection
-- with an owning `account_id` (the staff/internal-exclusion contract the union enforces on every
-- arm). Bronze is per-device-per-app, all-text, NOT account-relatable on its own. So, exactly as
-- `cloud_asset` (0130 bronze → silver) gave the cloud CI a home, this migration adds the thin
-- silver projection `software_ci` that is the software CI's home.
--
-- WHAT IT IS. One `software_ci` row per software INSTALL — the natural grain of the bronze
-- (one app on one device). This grain is deliberate: it makes `device runs software` a REAL
-- foreign key (`software_ci.device_id`), so the edge is DERIVED from a true link, never
-- fabricated (the cardinal rule 0131/0144 followed when they OMITTED device→user / cloud→device
-- for lack of a silver FK). `account_id` is resolved through the owning device, so the software
-- CI inherits the same staff/internal exclusion as the device it runs on. Distributor/source-
-- agnostic by construction (a `source` discriminator, `intune` first — the cloud_asset/provider
-- precedent), so a future software feed (e.g. Datto RMM software inventory) adds rows, not a table.
-- It is a PROJECTION of bronze (archetype A merge silver), NOT a system of record: the source is
-- authoritative; the app never edits it (read-only CMDB, ADR-0047).
--
-- WHO WRITES IT. The on-prem local-pipeline bronze→silver merge (merge-co-locates-with-ingestion,
-- LP ADR-0026 — the local pipeline collects `intune_managed_apps`, so it owns this merge):
-- `Invoke-ImperionSoftwareCiMerge` reads `intune_managed_apps`, resolves the device via the same
-- keys the device CI laterals on (`managed_device_id` = `intune_managed_devices.external_id`,
-- `serial_number` fallback) → silver `device` → `device.account_id`, and upserts one row per
-- (source, device_id, app key). Filed as the LP populate twin of this PR. Idempotent upsert.
--
-- NOT IN SCOPE (deliberate):
--   * software→user edges — there is no per-user app-assignment FK in silver today; OMITTED
--     (the 0131/0144 precedent) until such a link is modelled. Manual edges (cmdb:write) may
--     assert one meanwhile.
-- (Unlike 0144 for cloud, this migration DOES widen `change_affected_ci.ci_type` below — the
-- change form sources CIs from the union, so leaving that CHECK behind would break attaching a
-- software CI to an ITIL change. All curated-layer CHECKs are widened together here.)
--
-- New silver entity → it gets a NEW OKF concept file (docs/database/semantic-layer/tables/
-- software_ci.md) + a coverage-matrix row + an index row in THIS PR (system CLAUDE.md §11; the
-- semantic-layer gate requires the concept file for a CREATE of a concept-bearing silver table).
-- Frontend-owned schema (ADR-0042). Additive + idempotent + transactional. PII-adjacent (an
-- account-linked software inventory), access-controlled (ADR-0039); no secrets. DORMANT — 0 rows
-- until `intune_managed_apps` fills (the Mark-gated DeviceManagementApps.Read.All grant + 0148
-- apply) and the LP merge twin runs. NOT prod-applied until the orchestrator/Mark runs it.

BEGIN;

-- ── software_ci: silver software Configuration Item (one row per software install) ───────────
CREATE TABLE IF NOT EXISTS software_ci (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Owning client. Resolved by the merge through the device the software runs on
  -- (device.account_id). ON DELETE CASCADE: a software install cannot outlive its account.
  account_id    uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  -- The device the software is installed on — the FK that makes `device runs software` a
  -- DERIVED (real) edge. ON DELETE CASCADE: an install cannot outlive its device.
  device_id     uuid NOT NULL REFERENCES device(id) ON DELETE CASCADE,
  -- Software identity (from the bronze app row).
  name          text NOT NULL,            -- app display name
  publisher     text,                     -- app publisher / vendor
  version       text,                     -- detected installed version
  platform      text,                     -- windows | iOS | android | macOS | …
  install_state text,                     -- installed | failed | pendingInstall | …
  -- Distributor/source discriminator (intune first) — a future feed adds rows, not a table.
  source        text NOT NULL DEFAULT 'intune',
  -- Provider-native id of the bronze app row (intune_managed_apps.external_id), kept for the
  -- merge's idempotent re-resolve. Unique with source + device_id (one install row per app key).
  external_ref  text NOT NULL,
  last_seen_at  timestamptz,              -- bronze collected_at of the latest merge
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- One silver row per (source, device, app key): the merge UPSERTs on this key, idempotently.
  CONSTRAINT software_ci_install_uq UNIQUE (source, device_id, external_ref)
);
COMMENT ON TABLE software_ci IS
  'Silver software Configuration Item (#652, parent #372, ADR-0078/0097): one row per software INSTALL (app on a device — the grain of bronze intune_managed_apps, 0148). account_id resolves through the owning device; device_id makes `device runs software` a derived (real-FK) edge. Read-only projection of bronze (archetype A), source-agnostic (source discriminator, intune first). The on-prem LP merge Invoke-ImperionSoftwareCiMerge writes it (LP ADR-0026). DORMANT until the Intune managed-apps bronze fills. PII-adjacent (account-linked software inventory), no secrets. Migration 0204 (PLACEHOLDER — real number at merge).';
COMMENT ON COLUMN software_ci.device_id IS
  'The device this software is installed on — the FK that derives the `device runs software` CMDB edge (ci_relationship). ON DELETE CASCADE.';
COMMENT ON COLUMN software_ci.source IS
  'Feed discriminator (intune first). A future software-inventory feed (e.g. Datto RMM) adds rows under a new source, not a new table — the cloud_asset/provider precedent.';

-- Register/drill reads filter by account; the merge + edge derivation read by device.
CREATE INDEX IF NOT EXISTS ix_software_ci_account ON software_ci (account_id);
CREATE INDEX IF NOT EXISTS ix_software_ci_device ON software_ci (device_id);

-- ── Grants (the cloud_asset/0131 pattern) ────────────────────────────────────────────────────
-- The LP merge writes (upsert, no DELETE — CASCADE handles removals). The web role reads it for
-- the CI union + drill. Backend reads (a future CMDB/impact agent). Cloud pipeline reads
-- (observability). Defensive — roles may be absent in a given environment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON software_ci TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON software_ci TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON software_ci TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON software_ci TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
END $$;

-- ── Widen the CI-type CHECKs to admit `software` (the 0144 precedent for `cloud`) ────────────
-- Drop-then-add (names are the Postgres defaults). Widening a CHECK never fails validation
-- against existing rows. Re-runnable: DROP IF EXISTS + ADD.
ALTER TABLE ci_relationship DROP CONSTRAINT IF EXISTS ci_relationship_from_ci_type_check;
ALTER TABLE ci_relationship
  ADD CONSTRAINT ci_relationship_from_ci_type_check
  CHECK (from_ci_type IN ('account', 'user', 'device', 'cloud', 'software'));
ALTER TABLE ci_relationship DROP CONSTRAINT IF EXISTS ci_relationship_to_ci_type_check;
ALTER TABLE ci_relationship
  ADD CONSTRAINT ci_relationship_to_ci_type_check
  CHECK (to_ci_type IN ('account', 'user', 'device', 'cloud', 'software'));

ALTER TABLE cmdb_ci_overlay DROP CONSTRAINT IF EXISTS cmdb_ci_overlay_ci_type_check;
ALTER TABLE cmdb_ci_overlay
  ADD CONSTRAINT cmdb_ci_overlay_ci_type_check
  CHECK (ci_type IN ('account', 'user', 'device', 'cloud', 'software'));

-- change_affected_ci (0135/0145) carries a polymorphic CI endpoint too. Widen it now so an
-- ITIL change_request can list a software CI as affected — the change form sources CIs from
-- the `cmdb_ci` union (which now includes software), so leaving this CHECK behind would make
-- such an INSERT fail. Closes the software-CI CHECK gap across ALL curated-layer tables in one
-- move (the same all-tables widening 0144 made for cloud).
ALTER TABLE change_affected_ci DROP CONSTRAINT IF EXISTS change_affected_ci_ci_type_check;
ALTER TABLE change_affected_ci
  ADD CONSTRAINT change_affected_ci_ci_type_check
  CHECK (ci_type IN ('account', 'user', 'device', 'cloud', 'software'));

-- ── Seed the software derived edges + overlay (the same recompute the repository runs) ───────
-- Re-runnable and manual-safe: only adds derived rows (ON CONFLICT) — manual edges + admin
-- overrides are never touched. DORMANT: 0 rows until software_ci fills.

-- software runs-on device (software_ci.device_id) — read `software -[runs-on]-> device`.
INSERT INTO ci_relationship
  (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
SELECT 'software', s.id::text, 'device', s.device_id::text, 'runs-on', 'derived'
  FROM software_ci s
ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
DO NOTHING;

-- software belongs-to account (software_ci.account_id) — mirrors device/cloud/user.
INSERT INTO ci_relationship
  (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
SELECT 'software', s.id::text, 'account', s.account_id::text, 'belongs-to', 'derived'
  FROM software_ci s
 WHERE s.account_id IS NOT NULL
ON CONFLICT (from_ci_type, from_ci_id, to_ci_type, to_ci_id, relation_type, source)
DO NOTHING;

-- software derived_default criticality — a flat `low` baseline (supporting asset; no rich
-- silver signal). Mirrors deriveSoftwareCriticality in src/lib/cmdb/criticality.ts. `critical`
-- is never auto-derived (admin override only).
INSERT INTO cmdb_ci_overlay (ci_type, ci_id, derived_default)
SELECT 'software', s.id::text, 'low'::ci_criticality
  FROM software_ci s
ON CONFLICT (ci_type, ci_id)
DO UPDATE SET derived_default = EXCLUDED.derived_default, updated_at = now();

COMMIT;
