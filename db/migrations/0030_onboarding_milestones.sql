-- Onboarding milestones with red/yellow/green health (ADR-0034). Major steps
-- under a delivery `project`, each with a status and a R/Y/G health that drives
-- the onboarding dashboard — the project-management capability we offload from
-- Autotask. `auto_check_key` names a future automation rule that will flip a
-- milestone from observed system state (the auto-completion check is deferred to
-- the back-end). Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE milestone_status AS ENUM ('not_started', 'in_progress', 'blocked', 'complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE milestone_health AS ENUM ('green', 'amber', 'red');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS project_milestone (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name           text NOT NULL,
  ordinal        int NOT NULL DEFAULT 0,
  status         milestone_status NOT NULL DEFAULT 'not_started',
  health         milestone_health NOT NULL DEFAULT 'amber',
  auto_check_key text,            -- future automation: rule that observes completion
  notes          text,
  due_at         date,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, ordinal)
);
COMMENT ON TABLE project_milestone IS
  'Onboarding/implementation milestones with R/Y/G health; offloads Autotask PM (ADR-0034).';

CREATE INDEX IF NOT EXISTS idx_milestone_project ON project_milestone(project_id);

DROP TRIGGER IF EXISTS trg_milestone_updated ON project_milestone;
CREATE TRIGGER trg_milestone_updated BEFORE UPDATE ON project_milestone
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
