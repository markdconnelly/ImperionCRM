-- 0109 editable project / task templates (ADR-0070 E1, issue #352)
-- Migration number 0109 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration
-- merges during the CI window, renumber the file (rename is data-safe).
--
-- Generalises the hard-coded onboarding playbook (lib/onboarding-template.ts,
-- ADR-0037) into admin-editable project templates. Two additive tables:
--
--   1. project_template (NEW silver table) — { id, key, name, description,
--      project_type_id?, is_protected }. A reusable, user-defined playbook the
--      project-create flow instantiates from. project_type_id is NULLABLE (an
--      optional binding; NULL = any type). is_protected marks a seeded built-in
--      that cannot be deleted (the onboarding playbook). A website-native
--      operational object (no external source-of-record); its OKF concept file
--      ships in this PR (docs/database/semantic-layer/tables/project_template.md).
--
--   2. template_item (NEW) — { id, template_id CASCADE, parent_id (self-FK),
--      kind: milestone|step|task, ordinal, payload jsonb }. The template's tree.
--      parent_id realises ADR-0070's `parent_ref` as a self-referential FK:
--      milestones are top-level (parent_id NULL); steps/tasks point at their
--      milestone. payload carries the snapshot fields (title/name + offset_days +
--      duration_days) — jsonb so the shape can grow (checklist subtasks, ADR-0070
--      E1-F3) without a migration.
--
-- Apply = SNAPSHOT (ADR-0070): instantiating copies items onto the new project;
-- later template edits never retro-mutate live projects. That copy is a RUNTIME
-- operation in the read/write layer (instantiateProjectTemplate), not schema.
--
-- The seeded onboarding playbook is a PROTECTED row with NO template_items: its
-- instantiation delegates to the existing applyOnboardingTemplate (the hard-coded
-- lib/onboarding-template.ts), so there is no behaviour change for current
-- onboarding and no second copy of the playbook to drift (ADR-0070 E1-F4).
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII (templates are
-- internal authoring objects).

BEGIN;

-- ── project_template: a reusable, user-editable project playbook (ADR-0070 E1) ──
CREATE TABLE IF NOT EXISTS project_template (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  project_type_id uuid REFERENCES project_type(id) ON DELETE SET NULL,  -- NULL = any type
  is_protected    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE project_template IS
  'Reusable, admin-editable project playbook (ADR-0070 E1, #352). Generalises the hard-coded onboarding playbook. Instantiated as a SNAPSHOT onto a new project; later edits never retro-mutate live projects. Website-native operational object (no external source-of-record). No client PII.';
COMMENT ON COLUMN project_template.project_type_id IS
  'Optional binding to a project type (ADR-0052 table, not enum). NULL = applies to any type. ON DELETE SET NULL — retiring a type leaves the template usable.';
COMMENT ON COLUMN project_template.is_protected IS
  'TRUE for a seeded built-in that cannot be deleted (the onboarding playbook, ADR-0070 E1-F4). Its instantiation delegates to the hard-coded lib/onboarding-template.ts.';

-- ── template_item: the template tree (milestone → step|task), ADR-0070 ──────────
-- parent_id is ADR-0070's parent_ref realised as a self-FK. payload jsonb carries
-- the snapshot fields { name|title, offsetDays, durationDays } — jsonb so checklist
-- subtasks (E1-F3) can ride later without a migration.
CREATE TABLE IF NOT EXISTS template_item (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES project_template(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES template_item(id) ON DELETE CASCADE,  -- NULL = top-level milestone
  kind        text NOT NULL CHECK (kind IN ('milestone', 'step', 'task')),
  ordinal     integer NOT NULL DEFAULT 0,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE template_item IS
  'One node of a project_template tree (ADR-0070 E1, #352). kind: milestone (top-level, parent_id NULL) | step | task (nested under a milestone via parent_id). payload jsonb = snapshot fields (name/title, offsetDays, durationDays). Copied onto a project at instantiation.';
COMMENT ON COLUMN template_item.parent_id IS
  'ADR-0070 parent_ref as a self-FK: NULL for a milestone; the owning milestone''s id for a step/task. ON DELETE CASCADE — removing a milestone removes its children.';

-- Read order: a template's items by parent then position.
CREATE INDEX IF NOT EXISTS idx_template_item_template ON template_item (template_id, parent_id, ordinal);

-- updated_at trigger (mirrors sprint/goal). set_updated_at() defined by an earlier
-- migration; DROP-then-CREATE keeps this idempotent on re-run.
DROP TRIGGER IF EXISTS trg_project_template_updated ON project_template;
CREATE TRIGGER trg_project_template_updated BEFORE UPDATE ON project_template
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the protected onboarding default (ADR-0070 E1-F4). NO template_items: its
-- instantiation delegates to lib/onboarding-template.ts, so there is no behaviour
-- change and no duplicate playbook to drift.
INSERT INTO project_template (key, name, description, is_protected)
VALUES (
  'standard_msp',
  'Standard MSP Onboarding',
  'Seeded protected default — the hard-coded onboarding playbook (ADR-0037). Instantiation delegates to lib/onboarding-template.ts; not user-editable.',
  true
)
ON CONFLICT (key) DO NOTHING;

-- Grants for the web role (mirrors 0107's guarded grant block).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON project_template TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON template_item TO "mgid-imperioncrm-web-prd";
  END IF;
END $$;

COMMIT;
