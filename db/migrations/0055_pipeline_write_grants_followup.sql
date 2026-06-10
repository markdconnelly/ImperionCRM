-- 0055: Write-grant follow-ups for the two pipeline identities (2026-06-10).
--
-- Two gaps surfaced as the pipelines fanned out, both blocking writes that the
-- code now performs:
--
-- 1. CLOUD pipeline (`mgid-imperioncrmpipeline`): the Autotask ticket webhook
--    (pipeline ADR-0013) lands tickets in the shared `autotask_tickets` bronze
--    in real time. 0051 granted SELECT only (the merge read path) — the webhook
--    upsert also needs INSERT/UPDATE. Same key + content-hash semantics as the
--    local pipeline's bulk reconcile, so the two writers coexist (cross-repo
--    action item #5).
--
-- 2. LOCAL pipeline (`imperion-localpipeline`): the new per-object bronze post
--    writers (local-pipeline PR #68) target the migration-0036 per-source
--    tables, which 0044's grant list predates: m365_contacts, m365_devices,
--    itglue_companies, itglue_contacts, itglue_devices. SELECT for the upsert's
--    existence/hash check, INSERT, UPDATE — never DELETE (idempotent upserts
--    only), matching 0044's posture.
--
-- Idempotent (re-running re-grants harmlessly); no-ops if a role is absent.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.';
  ELSE
    -- Webhook ticket landing (SELECT already granted by 0051).
    GRANT INSERT, UPDATE ON autotask_tickets TO "mgid-imperioncrmpipeline";
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  ELSE
    -- Per-source bronze writers (local-pipeline PR #68) on the 0036 tables.
    GRANT SELECT, INSERT, UPDATE ON
      m365_contacts, m365_devices,
      itglue_companies, itglue_contacts, itglue_devices
    TO "imperion-localpipeline";
  END IF;
END $$;

COMMIT;
