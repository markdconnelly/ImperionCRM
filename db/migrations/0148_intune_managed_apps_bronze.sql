-- 0148: Intune managed-apps bronze table (#261, child of CMDB epic #873; per-source
-- bronze ADR-0039; Intune device/posture precedent ADR-0047/0051; bronze envelope
-- 0038/0069/0136 contract).
--
-- Mark per-source review 2026-06-12: Intune should feed DRILLABLE asset detail. Devices
-- (0069), compliance, and config policies (0038) already exist; the remaining gap is the
-- per-device managed-APP inventory. This adds the bronze the device CI detail drills into.
--
-- The on-prem collector (local-pipeline companion, ImperionCRM_LocalPipelineEnrichment;
-- Graph `DeviceManagementApps.Read.All`, app-only partner-tenant token — that grant is
-- Mark-gated ops) flattens the Intune managed-device per-app inventory (Graph
-- `/deviceManagement/managedDevices/{id}/detectedApps`, mobile-app intent/state, or the
-- mobileApps assignment report) into the standard local-pipeline bronze envelope: flat
-- columns are text (the loader stringifies; true types + the lossless payload live in
-- `raw_payload`), PK (tenant_id, source, external_id), content_hash. The collector
-- self-gates (Warn + exit) until this migration is applied to prod — so the prod table is
-- EMPTY until then and the device-detail "Managed apps" section degrades to an absent/empty
-- state, never an error (ADR-0051 §6: absent beats a wrong value).
--
-- DRILL JOIN. Managed apps belong to a device. The queryable join keys mirror the silver
-- `device` merge keys (0069): `managed_device_id` (the Intune managed-device id — the
-- primary join, equals `intune_managed_devices.external_id`) and `serial_number` (the
-- fallback, the same key the device CI already laterals `intune_managed_devices` on). Both
-- indexed. This is BRONZE: no silver entity, no OKF concept file (the semantic-layer gate
-- does not apply to bronze tables).
--
-- Grants (0069/0136 pattern — writer gets idempotent-upsert rights, never DELETE; consumers
-- get SELECT). The web role reads it directly for the device-detail drill section.
--
-- Additive, idempotent, transactional. No secrets, no PII beyond app/device inventory
-- metadata (access-controlled, ADR-0039). Migration 0148 (PLACEHOLDER — real number claimed
-- at merge).

BEGIN;

CREATE TABLE IF NOT EXISTS intune_managed_apps (
  -- Drill join keys (mirror the silver `device` merge keys, 0069).
  managed_device_id text,            -- Intune managed-device id (= intune_managed_devices.external_id)
  serial_number text,                -- fallback device join key (same key the device CI laterals on)
  device_name text,                  -- denormalised for display / cross-check
  -- App identity + inventory state.
  app_id text,                       -- Graph app id (detectedApp id / mobileApp id)
  display_name text,                 -- app display name
  publisher text,                    -- app publisher / vendor
  version text,                      -- detected installed version
  platform text,                     -- 'windows' | 'iOS' | 'android' | 'macOS' | ...
  install_state text,                -- 'installed' | 'failed' | 'pendingInstall' | 'notInstalled' | ...
  install_state_detail text,         -- Graph installStateDetail (failure reason etc.)
  app_type text,                     -- 'detected' (inventory) | 'managed' (assigned) — feed provenance
  size_in_bytes text,                -- detected app size when known
  last_modified_date_time text,      -- app/assignment last-modified timestamp (Graph)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE intune_managed_apps IS
  'Bronze: Intune per-device managed/detected apps (Graph DeviceManagementApps.Read.All) via the on-prem collector (#261, ADR-0039). external_id = the per-device app row id (managed_device_id + app_id). managed_device_id (= intune_managed_devices.external_id) / serial_number are the drill-join keys to the silver device; bronze stays all-text (true types in raw_payload).';

-- Drill-join indexes (the device-detail section reads apps for one device).
CREATE INDEX IF NOT EXISTS ix_intune_managed_apps_device
  ON intune_managed_apps (managed_device_id);
CREATE INDEX IF NOT EXISTS ix_intune_managed_apps_serial
  ON intune_managed_apps (serial_number);

-- ── Grants ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON intune_managed_apps TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON intune_managed_apps TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON intune_managed_apps TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON intune_managed_apps TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
END $$;

COMMIT;
