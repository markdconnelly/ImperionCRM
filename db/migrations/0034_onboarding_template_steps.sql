-- Onboarding template instantiation (ADR-0037). The standard MSP onboarding
-- playbook (lib/onboarding-template.ts) is applied to a delivery `project`:
-- each phase becomes a `project_milestone` (the R/Y/G major step) and each
-- checklist item becomes an `onboarding_step` linked to that milestone. Checking
-- off steps drives the phase's derived R/Y/G — the in-app automation of "what
-- steps have been completed". Ad-hoc PM work still uses the shared `task` object
-- (category project/onboarding); this table is the structured playbook checklist.
-- Idempotent and transactional.

BEGIN;

-- Phase window: start_at (due_at already exists as the phase end).
ALTER TABLE project_milestone
  ADD COLUMN IF NOT EXISTS start_at date;

CREATE TABLE IF NOT EXISTS onboarding_step (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  milestone_id  uuid REFERENCES project_milestone(id) ON DELETE CASCADE,
  code          text NOT NULL,                 -- playbook code, e.g. "1.1"
  title         text NOT NULL,
  is_comm       boolean NOT NULL DEFAULT false, -- a "Send - …" client communication step
  ordinal       int NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'open',   -- open|done
  due_at        date,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, code)
);
COMMENT ON TABLE onboarding_step IS
  'Per-project instantiation of the standard onboarding playbook checklist (ADR-0037).';

CREATE INDEX IF NOT EXISTS idx_onboarding_step_project   ON onboarding_step(project_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_step_milestone ON onboarding_step(milestone_id);

DROP TRIGGER IF EXISTS trg_onboarding_step_updated ON onboarding_step;
CREATE TRIGGER trg_onboarding_step_updated BEFORE UPDATE ON onboarding_step
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
