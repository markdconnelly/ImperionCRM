-- Follow-up to 0049: the cloud pipeline's contract/ticket merge (front-end ADR-0044)
-- reads the LOCAL-pipeline bronze tables (autotask_contracts / autotask_tickets), which
-- 0049's grant list missed — mergeContractSources failed with permission denied and took
-- the whole merge-sources sweep down with it. SELECT only; idempotent; no-ops if the
-- role is absent.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping.';
    RETURN;
  END IF;
  GRANT SELECT ON autotask_contracts, autotask_tickets TO "mgid-imperioncrmpipeline";
END $$;

COMMIT;
