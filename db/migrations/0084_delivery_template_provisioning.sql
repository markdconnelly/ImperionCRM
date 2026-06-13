-- 0084: Delivery templates + provisioning contract gate (ADR-0081, issue #449).
--
-- ADR-0080 built the orchestration spine (project_provisioning/task_ticket_fire,
-- 0082) but left the executor with no INPUT: nothing turns a won opportunity into
-- a native delivery project, and the only template was the hardcoded onboarding
-- playbook (ADR-0037). This migration adds:
--   1. A data-driven delivery_template (template → phases → tasks), generalizing
--      the onboarding playbook shape so the board can instantiate ANY delivery
--      playbook a human picks. Each template task optionally carries a JIT
--      dispatch-ticket spec (maps 1:1 to task_ticket_fire at instantiation).
--   2. A hard contract gate on project_provisioning: the executor must not
--      provision until contract_state = 'signed' (DocuSign, ADR-0071/#318). Built
--      now, enforced, but inert (state stays 'none') until DocuSign is wired.
--
-- Onboarding's own ONBOARDING_TEMPLATE/applyOnboardingTemplate machinery is
-- UNTOUCHED (ADR-0081 §5 — converge later). Additive, idempotent, transactional.
-- Frontend-owned schema (ADR-0042). No secrets.

BEGIN;

-- ── delivery_template: a reusable delivery playbook ───────────────────────────
CREATE TABLE IF NOT EXISTS delivery_template (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text NOT NULL UNIQUE,            -- stable machine key, e.g. 'standard_network_refresh'
  name            text NOT NULL,
  description     text,
  version         integer NOT NULL DEFAULT 1,
  -- Optional binding to a project type so the board picker can filter to relevant
  -- templates; NULL = applicable to any type. RESTRICT: deleting a type in use
  -- by a template should fail loudly (mirrors project.project_type_id, 0058).
  project_type_id uuid REFERENCES project_type(id) ON DELETE RESTRICT,
  is_active       boolean NOT NULL DEFAULT true,   -- inactive templates hide from the picker, keep history
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE delivery_template IS
  'A reusable, data-driven delivery playbook (ADR-0081). The human picks one on the board to provision a won opportunity; instantiation emulates it as a native project + tasks, which the backend executor then emulates into Autotask. Generalizes the onboarding playbook (ADR-0037), which stays separate for now.';

CREATE INDEX IF NOT EXISTS idx_delivery_template_type ON delivery_template (project_type_id);
CREATE INDEX IF NOT EXISTS idx_delivery_template_active ON delivery_template (is_active) WHERE is_active;

DROP TRIGGER IF EXISTS trg_delivery_template_updated ON delivery_template;
CREATE TRIGGER trg_delivery_template_updated BEFORE UPDATE ON delivery_template
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── delivery_template_phase: a major step (→ project_milestone at instantiate) ─
CREATE TABLE IF NOT EXISTS delivery_template_phase (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES delivery_template(id) ON DELETE CASCADE,
  ordinal       integer NOT NULL,                  -- 1..n display/sequence order
  name          text NOT NULL,
  -- Schedule skeleton (mirrors OnboardingPhaseDef): days from project start to
  -- this phase's start, and its length. Phases may overlap.
  offset_days   integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, ordinal)
);
COMMENT ON TABLE delivery_template_phase IS
  'A phase of a delivery_template — becomes a project_milestone at instantiation (ADR-0081). offset_days/duration_days compute dates from the project start, as the onboarding playbook does.';

CREATE INDEX IF NOT EXISTS idx_delivery_template_phase_template ON delivery_template_phase (template_id);

DROP TRIGGER IF EXISTS trg_delivery_template_phase_updated ON delivery_template_phase;
CREATE TRIGGER trg_delivery_template_phase_updated BEFORE UPDATE ON delivery_template_phase
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── delivery_template_task: a task (→ task at instantiate) + dispatch-ticket spec
CREATE TABLE IF NOT EXISTS delivery_template_task (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id         uuid NOT NULL REFERENCES delivery_template_phase(id) ON DELETE CASCADE,
  ordinal          integer NOT NULL,
  title            text NOT NULL,
  -- Task-level schedule offset within the project (from project start). The JIT
  -- ticket (if any) fires ticket_lead_days BEFORE this start.
  offset_days      integer NOT NULL DEFAULT 0,
  duration_days    integer NOT NULL DEFAULT 0,
  -- Dispatch-ticket spec (ADR-0080 §7 JIT firing). When dispatches_ticket, the
  -- instantiated task gets a task_ticket_fire row; the executor creates an
  -- Autotask project-queue ticket ticket_lead_days before the task's start.
  dispatches_ticket boolean NOT NULL DEFAULT false,
  ticket_queue_id   bigint,                         -- Autotask queue (Project Mgmt = 29683483 in prod; env config, not a const)
  ticket_title      text,                           -- defaults to the task title when null
  ticket_lead_days  integer NOT NULL DEFAULT 0,     -- JIT window: fire this many days before task start
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase_id, ordinal),
  -- A dispatching task must name a queue; a non-dispatching one must not carry ticket fields.
  CONSTRAINT delivery_template_task_ticket_spec CHECK (
    (dispatches_ticket AND ticket_queue_id IS NOT NULL)
    OR (NOT dispatches_ticket AND ticket_queue_id IS NULL AND ticket_title IS NULL)
  )
);
COMMENT ON TABLE delivery_template_task IS
  'A task within a delivery_template phase — becomes a native task at instantiation (ADR-0081). dispatches_ticket flags tasks that JIT-fire an Autotask project-queue ticket (ADR-0080 §7), mapped 1:1 to task_ticket_fire.';

CREATE INDEX IF NOT EXISTS idx_delivery_template_task_phase ON delivery_template_task (phase_id);

DROP TRIGGER IF EXISTS trg_delivery_template_task_updated ON delivery_template_task;
CREATE TRIGGER trg_delivery_template_task_updated BEFORE UPDATE ON delivery_template_task
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── project_provisioning: add template ref + hard contract gate (ADR-0081 §3) ──
-- The template a provisioning was instantiated from (audit/repro; SET NULL keeps
-- the provisioning row if the template is later retired).
ALTER TABLE project_provisioning
  ADD COLUMN IF NOT EXISTS delivery_template_id uuid REFERENCES delivery_template(id) ON DELETE SET NULL;

-- Hard contract gate: the executor MUST NOT provision unless contract_state='signed'.
-- Stays 'none' (inert) until DocuSign (#318/ADR-0071) is wired. contract_envelope_ref
-- is the DocuSign envelope id; contract_signed_at stamps the signed transition.
ALTER TABLE project_provisioning
  ADD COLUMN IF NOT EXISTS contract_state text NOT NULL DEFAULT 'none'
    CHECK (contract_state IN ('none','sent','signed'));
ALTER TABLE project_provisioning
  ADD COLUMN IF NOT EXISTS contract_signed_at   timestamptz;
ALTER TABLE project_provisioning
  ADD COLUMN IF NOT EXISTS contract_envelope_ref text;

COMMENT ON COLUMN project_provisioning.contract_state IS
  'Hard provisioning gate (ADR-0081 §3): the backend executor refuses to provision a row unless this is ''signed''. Set by DocuSign (ADR-0071); inert (''none'') until DocuSign is wired.';

-- The executor's gated work queue: rows ready to provision (signed + pending).
CREATE INDEX IF NOT EXISTS idx_project_provisioning_ready
  ON project_provisioning (provision_state)
  WHERE provision_state = 'pending' AND contract_state = 'signed';

-- ── Grants (0082 defensive pattern; roles may be absent in some envs) ──────────
DO $$
BEGIN
  -- Web (board): authors templates, instantiates, sets contract/fire intent.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_template      TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_template_phase TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_template_task  TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  -- Backend (executor): reads templates to emulate them into Autotask.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON delivery_template      TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON delivery_template_phase TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON delivery_template_task  TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
