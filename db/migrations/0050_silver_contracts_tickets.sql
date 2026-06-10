-- Silver `contract` + `ticket` tables (ADR-0044).
--
-- Contracts and tickets existed only as local-pipeline bronze (autotask_contracts /
-- autotask_tickets, all-text envelope) read directly by the UI and the knowledge
-- composers. This promotes them to first-class silver entities the app reads (ADR-0018:
-- the app reads silver) with typed columns and account/contact links; the cloud
-- pipeline's merge populates them from bronze (idempotent on (source, external_ref)).
-- `website` rows (manual entries) remain possible later under the ADR-0039 precedence
-- convention. Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS contract (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid REFERENCES account(id) ON DELETE SET NULL,
  name              text NOT NULL,
  contract_number   text,
  contract_type     text,
  category          text,
  status            text,
  start_date        date,
  end_date          date,
  estimated_revenue numeric,
  estimated_hours   numeric,
  sla_id            text,
  description       text,
  source            text NOT NULL DEFAULT 'autotask',
  external_ref      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_ref)
);
CREATE INDEX IF NOT EXISTS ix_contract_account ON contract (account_id);

-- `ticket` already exists (migration 0014: id/account_id/contact_id/source/external_ref/
-- number/title/status/priority/category/opened_at/closed_at/…, with uq_ticket_source_ref)
-- but was never populated. Extend it with the support-detail columns the Autotask merge
-- carries rather than shadowing it with a second shape.
ALTER TABLE ticket
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS resolution       text,
  ADD COLUMN IF NOT EXISTS sub_issue_type   text,
  ADD COLUMN IF NOT EXISTS ticket_type      text;
CREATE INDEX IF NOT EXISTS ix_ticket_last_activity ON ticket (last_activity_at DESC);

-- Grants: app reads; cloud pipeline merges; on-prem composer reads.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON contract, ticket TO "mgid-imperioncrm-web-prd";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON contract, ticket TO "mgid-imperioncrmpipeline";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON contract, ticket TO "mgid-imperioncrmbackendfunction";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON contract, ticket TO "imperion-localpipeline";
  END IF;
END $$;

COMMIT;
