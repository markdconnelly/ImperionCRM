-- Automation workflows (ADR-0014/0027). Nurture and pre-discovery sequences modeled
-- in-app as workflow → steps → enrollments (Power Automate only fires the actual
-- send/notify — no core logic there, CLAUDE.md §3). Pre-discovery workflows gather
-- discovery data via chat/text/email + agent enrichment before the human call.
-- Idempotent and transactional.

BEGIN;

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE workflow_kind AS ENUM ('nurture','pre_discovery','re_engagement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workflow_step_kind AS ENUM
    ('send_email','send_sms','chat_prompt','agent_enrich','wait','branch');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active','completed','exited');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Workflow / steps / enrollments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  kind               workflow_kind NOT NULL,
  trigger            jsonb,
  status             text NOT NULL DEFAULT 'active',    -- active|paused|archived
  created_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_step (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  ordinal     integer NOT NULL,
  kind        workflow_step_kind NOT NULL,
  config      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_enrollment (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          uuid NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  contact_id           uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  account_id           uuid REFERENCES account(id) ON DELETE SET NULL,
  status               enrollment_status NOT NULL DEFAULT 'active',
  current_step_ordinal integer NOT NULL DEFAULT 0,
  enrolled_at          timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_step_workflow       ON workflow_step(workflow_id, ordinal);
CREATE UNIQUE INDEX IF NOT EXISTS uq_step_workflow_ordinal ON workflow_step(workflow_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_enrollment_workflow ON workflow_enrollment(workflow_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_contact  ON workflow_enrollment(contact_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_workflow_updated ON workflow;
CREATE TRIGGER trg_workflow_updated BEFORE UPDATE ON workflow
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_workflow_step_updated ON workflow_step;
CREATE TRIGGER trg_workflow_step_updated BEFORE UPDATE ON workflow_step
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_enrollment_updated ON workflow_enrollment;
CREATE TRIGGER trg_enrollment_updated BEFORE UPDATE ON workflow_enrollment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
