-- Per-connection polling cadence (ADR-0038). Records how often the ingestion
-- pipeline should poll each connection (personal or company) for new data. The
-- ImperionCRM_Pipeline repo consumes this value; this repo remains the single
-- source of truth for the schema (CLAUDE.md §7). No secrets involved.
--
-- 0 = manual / paused: the pipeline performs no automatic polling for that
-- connection. Idempotent and transactional.

BEGIN;

ALTER TABLE connection
  ADD COLUMN IF NOT EXISTS poll_interval_minutes integer NOT NULL DEFAULT 60;

COMMENT ON COLUMN connection.poll_interval_minutes IS
  'How often (in minutes) the ingestion pipeline polls this connection for new data; 0 = manual/paused (ADR-0038).';

-- Guard against negative cadences slipping in from a bad write.
DO $$ BEGIN
  ALTER TABLE connection
    ADD CONSTRAINT connection_poll_interval_nonneg CHECK (poll_interval_minutes >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
