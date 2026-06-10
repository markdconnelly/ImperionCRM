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

CREATE TABLE IF NOT EXISTS ticket (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid REFERENCES account(id) ON DELETE SET NULL,
  contact_id       uuid REFERENCES contact(id) ON DELETE SET NULL,
  ticket_number    text,
  title            text NOT NULL,
  status           text,
  priority         text,
  issue_type       text,
  sub_issue_type   text,
  ticket_type      text,
  created_date     timestamptz,
  completed_date   timestamptz,
  last_activity_at timestamptz,
  description      text,
  resolution       text,
  source           text NOT NULL DEFAULT 'autotask',
  external_ref     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_ref)
);
CREATE INDEX IF NOT EXISTS ix_ticket_account ON ticket (account_id);
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
