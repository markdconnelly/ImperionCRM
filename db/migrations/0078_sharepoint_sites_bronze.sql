-- 0078: SharePoint site inventory bronze — site METADATA only, no file content
-- (#255; posture/tenant model ADR-0051; per-client app pipeline ADR-0018).
--
-- Mark per-source review 2026-06-12: bring in a detailed, drillable list of
-- SharePoint sites per client. Explicitly NO file content — Files.Read.All was
-- pruned from the Onboarding app the same day; Sites.Read.All is retained. This
-- table therefore carries site-level metadata ONLY: no file, drive, item, or
-- document columns, ever. Domain entirely absent today.
--
-- The on-prem collector (local-pipeline companion issue; Sites.Read.All)
-- flattens Graph /sites (getAllSites enumeration) to the standard local-pipeline
-- bronze envelope (0038/0069 contract): flat columns are text (loader
-- stringifies; true types live in raw_payload), PK (tenant_id, source,
-- external_id) where external_id = the Graph composite site id, lossless raw
-- payload + content_hash. Storage metrics are nullable — populated only where
-- Graph exposes them for the site. The collector self-gates until this is
-- applied to prod.
--
-- Grants (0069/0076/0077 pattern — writer gets idempotent-upsert rights, never
-- DELETE; consumers get SELECT).
--
-- Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── Bronze: Graph /sites — site metadata only (NO file/drive columns) ────────
CREATE TABLE IF NOT EXISTS sharepoint_sites (
  display_name text, name text, web_url text, description text,
  created_date_time text, last_modified_date_time text,
  web_template text, is_personal_site text, site_collection_hostname text,
  storage_used_bytes text, storage_quota_bytes text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE sharepoint_sites IS
  'Bronze: SharePoint site inventory (Graph /sites) via the on-prem collector (#255). Site METADATA only — Sites.Read.All; Files.Read.All was pruned, so no file/drive/item data may ever land here. external_id = Graph composite site id.';

-- ── Grants ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON sharepoint_sites TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON sharepoint_sites TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON sharepoint_sites TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON sharepoint_sites TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
