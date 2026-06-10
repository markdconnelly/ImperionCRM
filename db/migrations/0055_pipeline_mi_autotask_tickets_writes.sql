-- Follow-up to 0051: the cloud pipeline's live Autotask ticket webhook (pipeline PR #16,
-- feat/webhook-payload-handlers) upserts into the autotask_tickets bronze table on
-- (tenant_id, source, external_id) with a content_hash change guard — but 0051 granted
-- SELECT only, so the webhook cannot land rows. Adds INSERT + UPDATE. No DELETE (the
-- upsert never deletes, per the 0049 posture). Idempotent; no-ops if the role is absent.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping.';
    RETURN;
  END IF;
  GRANT INSERT, UPDATE ON autotask_tickets TO "mgid-imperioncrmpipeline";
END $$;

COMMIT;
