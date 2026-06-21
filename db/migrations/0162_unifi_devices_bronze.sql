-- 0162: UniFi network-device bronze table (#1053, child of data-in epic #1038; per-source
-- bronze ADR-0039; bronze envelope 0038/0069/0136/0148 contract).
--
-- Migration 0149 added the `unifi` provider to the credential `connection` registry and the
-- UniFi credential/collector trio shipped (FE #964 · BE #233 · LP #259/#73, closed), but the
-- collector's LANDING TARGET was deferred — the bronze table never existed, so the on-prem
-- sweep (`Invoke-ImperionUniFiDeviceSync`) self-gates (Warn + skip) and no network-device data
-- reaches silver. This lands that half-built source: the table the collector writes to.
--
-- Shape is the LP collector contract (ImperionCRM_LocalPipelineEnrichment
-- `docs/integrations/unifi.md`, issue #73): UniFi network devices (switches, APs, gateways)
-- pulled per managed client + console, with the config-compliance signals the Devices view
-- needs (`status`, `firmware_version`, the available-but-unapplied `firmware_updatable`). Flat
-- columns are text (the loader stringifies; true types + the lossless payload live in
-- `raw_payload`), PK (tenant_id, source, external_id), content_hash for change-detected upsert.
-- Per-console isolation is absolute — every row carries its owning tenant (the account's mapped
-- Microsoft tenant, else the account id). The collector self-gates until this is applied to
-- prod, so the prod table is EMPTY until then and the Devices view degrades to absent, never an
-- error (ADR-0051 §6: absent beats a wrong value).
--
-- MERGE TARGET — silver `device` (network-infrastructure class), NOT `cloud_asset` (which is
-- ARM/cloud resources; UniFi gear is physical on-prem hardware). The bronze→silver merge runs
-- ON-PREM with the collector (merge co-locates with ingestion, LP ADR-0026) as a future
-- `Invoke-ImperionUniFiMerge` (LP follow-up); the proposed precedence + authority are documented
-- in the silver `device` OKF concept in this PR (`docs/database/semantic-layer/tables/device.md`).
-- `mac` is the network-device natural key the merge laterals on; indexed.
--
-- This is BRONZE: no silver entity here, no NEW OKF concept file (the semantic-layer gate is
-- silver-only, 0148 precedent). The `device` concept update rides this PR because `unifi` becomes
-- a contributing source of an existing silver entity (§11).
--
-- Grants (0148 pattern): the on-prem writer gets idempotent-upsert rights (never DELETE);
-- cloud-pipeline / backend / web get SELECT. Additive, idempotent, transactional. No secrets;
-- device inventory metadata is access-controlled (ADR-0039). Migration 0162 (PLACEHOLDER — real
-- number claimed at merge, system CLAUDE.md §10.3).

BEGIN;

CREATE TABLE IF NOT EXISTS unifi_devices (
  -- Flattened UniFi device fields (LP `Get-ImperionUniFiDevice`; everything else lossless in
  -- raw_payload). All-text bronze; true types live in raw_payload.
  name text,                  -- device name
  model text,                 -- hardware model
  mac text,                   -- MAC address (network-device natural key; merge join)
  ip_address text,            -- management IP
  site text,                  -- console site name (console API) / cloud host (Site Manager API)
  status text,                -- device state (online / offline / ...)
  firmware_version text,      -- installed firmware
  firmware_updatable text,    -- compliance signal: an available-but-unapplied update
  adopted text,               -- whether the device is adopted by the console
  last_seen text,             -- last contact timestamp (source-stringified)
  -- Standard local-pipeline bronze envelope (0038/0148).
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE unifi_devices IS
  'Bronze: UniFi network devices (switches/APs/gateways) + config-compliance signals via the on-prem collector (#1053/#73, ADR-0039). Per-client, per-console (X-API-Key; credential registry ADR-0103). external_id = the per-console device id; mac is the merge natural key into silver device (network-infra class, NOT cloud_asset). Merge co-locates on-prem (LP ADR-0026). All-text bronze; true types + lossless payload in raw_payload. EMPTY in prod until the collector self-gate clears.';

-- Merge natural key (the on-prem `Invoke-ImperionUniFiMerge` laterals silver `device` on mac).
CREATE INDEX IF NOT EXISTS ix_unifi_devices_mac ON unifi_devices (mac);

-- ── Grants (0148 pattern) ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON unifi_devices TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON unifi_devices TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON unifi_devices TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON unifi_devices TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
END $$;

COMMIT;
