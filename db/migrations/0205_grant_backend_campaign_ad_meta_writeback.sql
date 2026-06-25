-- 0205: Grant the backend role SELECT,UPDATE on `campaign` and `ad` for the Meta
-- Marketing API push write-back (#1332; ImperionCRM_Backend #416 / #406; ADR-0053 slice E).
--
-- The backend Meta push reads the facebook-platform campaign/ad worklist and writes the
-- created Meta object id back onto `external_ref` (both columns exist since 0023). It
-- therefore needs SELECT + UPDATE on `campaign` and `ad`. Migration 0071 already gave the
-- backend role its campaign_send/event/registration read-write and audience/consent reads
-- for the send executor, but nothing on campaign/ad — this fills that gap.
--
-- campaign_metric is NOT granted to the backend. ADR-0053 decision 7 ("Metrics stay polled,
-- never system of record", ADR-0012) and the ADR grants note keep campaign_metric writes
-- with the PIPELINE role (mgid-imperioncrmpipeline) via its daily Meta pull. The backend's
-- only metric-side write is delivery reconciliation onto campaign_send.delivered_count,
-- already covered by 0071's UPDATE on campaign_send.
--
-- Backend-only by design: the web app's role (mgid-imperioncrm) already owns these app
-- tables; per ADR-0042 every *process* (the Meta push) runs in the backend, so only the
-- backend MI gets the write-back verb here.
--
-- GRANT-only, idempotent, transactional; no-ops if the role is absent (CI / fresh DBs have
-- no MI role) so the ordered runner never wedges. Same guard pattern as 0071 / 0202.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping Meta write-back grants.';
    RETURN;
  END IF;

  GRANT SELECT, UPDATE ON campaign, ad TO "mgid-imperioncrmbackendfunction";
END $$;

COMMIT;
