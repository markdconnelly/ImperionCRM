-- 0053: Read-only device & cloud-asset inventory view (ADR-0047).
--
-- The Devices page is an INVENTORY — not editable in the app. It merges the
-- major details from every device-ish source into one view:
--   1. silver `device` (ADR-0039) — typed, merge-linked rows. Empty until the
--      itglue/m365/unifi device pulls land; fills in place with no UI change.
--   2. `itglue_export_configurations` (local-pipeline bronze, migration 0038)
--      — the 450+ real IT Glue configurations already loaded, account-linked
--      via the itglue org -> account_bronze_all citation chain.
-- A config that has been merged into silver (itglue_devices.device_id set) is
-- excluded from the bronze arm so devices never double-appear.
--
-- ASSUMPTION (flagged, ADR-0047): IT Glue attribute paths are read defensively
-- from BOTH envelope shapes — `raw_payload->'attributes'->>'x'` (JSON:API) and
-- `raw_payload->>'x'` (flattened) — kebab-case names per the live-API sampling
-- of 2026-06-08. Wrong paths degrade to NULL columns, never errors.

CREATE OR REPLACE VIEW device_inventory_all AS
  SELECT d.id::text                AS id,
         d.name                    AS name,
         d.device_type             AS device_type,
         d.manufacturer            AS manufacturer,
         d.model                   AS model,
         d.serial_number           AS serial_number,
         d.os                      AS os,
         d.status                  AS status,
         a.name                    AS account,
         'silver'::text            AS origin,
         d.last_seen_at::text      AS last_seen
    FROM device d
    LEFT JOIN account a ON a.id = d.account_id
  UNION ALL
  SELECT cfg.external_id,
         cfg.name,
         COALESCE(cfg.raw_payload->'attributes'->>'configuration-type-name',
                  cfg.raw_payload->>'configuration-type-name'),
         COALESCE(cfg.raw_payload->'attributes'->>'manufacturer-name',
                  cfg.raw_payload->>'manufacturer-name'),
         COALESCE(cfg.raw_payload->'attributes'->>'model-name',
                  cfg.raw_payload->>'model-name'),
         COALESCE(cfg.raw_payload->'attributes'->>'serial-number',
                  cfg.raw_payload->>'serial-number'),
         COALESCE(cfg.raw_payload->'attributes'->>'operating-system-name',
                  cfg.raw_payload->>'operating-system-name'),
         COALESCE(cfg.raw_payload->'attributes'->>'configuration-status-name',
                  cfg.raw_payload->>'configuration-status-name'),
         a.name,
         'itglue'::text,
         cfg.collected_at
    FROM itglue_export_configurations cfg
    LEFT JOIN account_bronze_all ab
           ON ab.source = 'itglue' AND ab.external_ref = cfg.organization_id
    LEFT JOIN account a ON a.id = ab.account_id
   WHERE NOT EXISTS (
           SELECT 1 FROM itglue_devices idv
            WHERE idv.external_ref = cfg.external_id AND idv.device_id IS NOT NULL
         );

COMMENT ON VIEW device_inventory_all IS
  'Read-only device & cloud-asset inventory (ADR-0047): silver device rows + not-yet-merged IT Glue configurations, one row per asset.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON device_inventory_all TO "mgid-imperioncrm-web-prd";
  END IF;
END $$;
