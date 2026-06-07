-- Delivery project (ADR-0010 delivery axis, ADR-0020). When an opportunity is won,
-- an onboarding/implementation project tracks the path to a managed customer. This
-- is the delivery spine; milestones, readiness items, and handoff (ERD Diagram 1)
-- hang off it in later migrations. Created now for manual CRUD in the GUI.
-- Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('onboarding','implementation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('not_started','in_progress','blocked','complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS project (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  opportunity_id    uuid REFERENCES opportunity(id) ON DELETE SET NULL,
  name              text NOT NULL,
  type              project_type NOT NULL DEFAULT 'onboarding',
  status            project_status NOT NULL DEFAULT 'not_started',
  target_live_date  date,                             -- planned go-live
  notes             text,
  started_at        timestamptz,                      -- set when status leaves not_started
  completed_at      timestamptz,                      -- set when status -> complete
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE project IS 'Onboarding/implementation delivery project for an account (ADR-0020).';

CREATE INDEX IF NOT EXISTS idx_project_account ON project(account_id);
CREATE INDEX IF NOT EXISTS idx_project_status  ON project(status);

DROP TRIGGER IF EXISTS trg_project_updated ON project;
CREATE TRIGGER trg_project_updated BEFORE UPDATE ON project
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
