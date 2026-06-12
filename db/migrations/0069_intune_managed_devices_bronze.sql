-- 0069: Intune managed-devices bronze table (#225 — schema handoff from
-- ImperionCRM_LocalPipelineEnrichment#75 / local PR #123, per ADR-0051 decision 6:
-- bronze per device unreduced, flat compliance queryable).
--
-- The on-prem collector (local `scheduled-tasks/m365/intune-devices.task.ps1`,
-- cert SP -> partner-tenant app-only Graph token, `DeviceManagementManagedDevices.Read.All`
-- already admin-consented) flattens Graph managedDevices to the standard local-pipeline
-- bronze envelope (0038/0065 contract): flat columns are text (loader stringifies; true
-- types live in raw_payload), PK (tenant_id, source, external_id), lossless raw payload +
-- content hash. The collector self-gates (Warn + exit) until this is applied to prod.
--
-- Silver merge joins `device` by serial_number / azure_ad_device_id — both indexed.
-- Downstream: frontend #162 device policy-applied indicator (read-only merge-join).
--
-- Grants (0044/0055/0065 pattern — writer gets idempotent-upsert rights, never DELETE;
-- consumers get SELECT):
--   imperion-localpipeline    SELECT, INSERT, UPDATE  (the bulk writer)
--   mgid-imperioncrmpipeline  SELECT                  (bronze→silver merge)
--   mgid-imperioncrm-web-prd  SELECT                  (device page indicator, defensive
--                                                      explicit grant like 0045)
--
-- Additive, idempotent, transactional. No secrets.

BEGIN;

CREATE TABLE IF NOT EXISTS intune_managed_devices (
  device_name text, managed_device_name text, os text, os_version text, compliance_state text,
  management_state text, manufacturer text, model text, serial_number text, imei text,
  wifi_mac_address text, azure_ad_device_id text, user_principal_name text,
  user_display_name text, email_address text, ownership text, enrolled_date_time text,
  last_sync_date_time text, is_encrypted text, device_category text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- Silver `device` merge-join keys (local #75).
CREATE INDEX IF NOT EXISTS ix_intune_managed_devices_serial ON intune_managed_devices (serial_number);
CREATE INDEX IF NOT EXISTS ix_intune_managed_devices_aad    ON intune_managed_devices (azure_ad_device_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON intune_managed_devices TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON intune_managed_devices TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON intune_managed_devices TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
END $$;

COMMIT;
