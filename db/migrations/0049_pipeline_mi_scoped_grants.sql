-- Scoped grants for the cloud pipeline's managed identity (mgid-imperioncrmpipeline).
--
-- On the Canada server this MI was a server-level Entra ADMIN — a least-privilege
-- violation (unified security standard §2: per-principal, table-scoped grants). With the
-- region move to imperioncrm-pg-prd-cus it becomes an ordinary Entra service role; this
-- migration grants exactly the surface the pipeline code touches (webhooks → bronze,
-- merge-sources → silver, on-demand refresh, connection health, audit):
--   bronze     — per-source physical tables it lands/links (ADR-0039 set + darkwebid/televy)
--   silver     — contact / account / device / credential_exposure / assessment_artifact
--   gold-edge  — interaction (summaries), contact_enrichment (refresh-path Apollo facts)
--   ops        — connection (sync_cursor/status), audit_log; SELECT on the union views
-- No DELETE anywhere (merge upserts; manual-entry deletes are the web app's). Idempotent;
-- no-ops if the role is absent so the ordered runner never wedges.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grants.';
    RETURN;
  END IF;

  -- Bronze (land + merge write-back)
  GRANT SELECT, INSERT, UPDATE ON
    autotask_contacts, autotask_companies, apollo_contacts, apollo_companies,
    itglue_contacts, itglue_companies, itglue_devices, m365_contacts, m365_devices,
    website_contacts, website_companies, website_devices,
    darkwebid_exposures, televy_reports
    TO "mgid-imperioncrmpipeline";

  -- Silver (merge targets)
  GRANT SELECT, INSERT, UPDATE ON
    contact, account, device, credential_exposure, assessment_artifact
    TO "mgid-imperioncrmpipeline";

  -- Gold-edge + enrichment
  GRANT SELECT, INSERT, UPDATE ON interaction, contact_enrichment
    TO "mgid-imperioncrmpipeline";

  -- Ops: connection health + audit; reads it needs for matching
  GRANT SELECT, UPDATE ON connection TO "mgid-imperioncrmpipeline";
  GRANT SELECT, INSERT ON audit_log TO "mgid-imperioncrmpipeline";
  GRANT SELECT ON assessment, opportunity, app_user TO "mgid-imperioncrmpipeline";

  -- Union views (the merge READS these; writes go to the physical tables)
  GRANT SELECT ON contact_bronze_all, account_bronze_all, device_bronze_all,
    exposure_bronze_all TO "mgid-imperioncrmpipeline";
END $$;

COMMIT;
