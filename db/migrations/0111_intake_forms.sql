-- 0111 form → task intake (ADR-0070 E3, issue #354)
-- Migration number 0111 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration
-- merges during the CI window, renumber the file (rename is data-safe).
--
-- Internal, staff-authenticated intake forms that create a task on submit. Two
-- additive tables:
--
--   1. intake_form (NEW) — { id, key, name, description, fields jsonb,
--      default_project_id?, default_account_id?, default_owner_user_id?,
--      default_category, is_active }. One reusable form definition. `fields` is a
--      jsonb array of field descriptors — { key, label, type (text|textarea|
--      date|select), required, options (select only), mapsTo (title|detail|
--      due_at|note) } — reusing the event.registration_page JSON-form pattern
--      (ADR-0053). jsonb so the field shape can grow (assignee/custom-field
--      mapping, #354 follow-ups) without a migration. The default_* columns route
--      every submission to one account/project/owner/queue (category).
--
--   2. intake_submission (NEW) — { id, form_id CASCADE, payload jsonb,
--      created_task_id?, submitted_by?, created_at }. One audit row per submit,
--      naming the task it produced. payload is the raw answer map (key → value).
--
-- The field → task mapping (title/detail/due_at/note) is a RUNTIME operation in
-- the read/write layer (submitIntakeForm), not schema.
--
-- Both are app-native operational/config objects (like custom_field_def /
-- saved_views / task_recurrence), NOT ingested silver entities with a
-- source-of-record contract — so the OKF semantic-layer gate does not apply:
-- no concept file, no coverage-matrix row.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII (intake forms are
-- internal staff request forms; payload carries staff-entered request text).

BEGIN;

-- ── intake_form: a reusable, staff-authored request form (ADR-0070 E3) ──────────
CREATE TABLE IF NOT EXISTS intake_form (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                  text NOT NULL UNIQUE,                 -- stable slug from the name
  name                 text NOT NULL,
  description          text,
  fields               jsonb NOT NULL DEFAULT '[]'::jsonb,   -- ordered field descriptors
  default_project_id   uuid REFERENCES project(id) ON DELETE SET NULL,
  default_account_id   uuid REFERENCES account(id) ON DELETE SET NULL,
  default_owner_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  default_category     text NOT NULL DEFAULT 'general'
                         CHECK (default_category IN ('sales', 'project', 'onboarding', 'general')),
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE intake_form IS
  'Internal staff-authenticated intake form (ADR-0070 E3, #354). Submitting it creates a task routed to the default account/project/owner/queue. fields jsonb = ordered descriptors { key, label, type, required, options, mapsTo } reusing the event.registration_page JSON-form pattern. App-native config object (no external source-of-record). No client PII.';
COMMENT ON COLUMN intake_form.fields IS
  'Ordered jsonb array of field descriptors: { key, label, type (text|textarea|date|select), required (bool), options (text[] for select), mapsTo (title|detail|due_at|note) }. The mapsTo of each field decides where its answer lands on the created task.';
COMMENT ON COLUMN intake_form.default_category IS
  'Task category the submission is filed under (ADR-0034) = the queue routing. One of sales|project|onboarding|general.';

-- ── intake_submission: an audit row per submit, naming the task created ──────────
CREATE TABLE IF NOT EXISTS intake_submission (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         uuid NOT NULL REFERENCES intake_form(id) ON DELETE CASCADE,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- raw answers, key → value
  created_task_id uuid REFERENCES task(id) ON DELETE SET NULL,
  submitted_by    uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE intake_submission IS
  'One submission of an intake_form (ADR-0070 E3, #354). payload = raw answer map; created_task_id names the task produced (SET NULL if the task is later deleted). Audit trail of who requested what. No client PII (staff request text only).';

-- Read order: a form's submissions, newest first (the form detail page audit list).
CREATE INDEX IF NOT EXISTS idx_intake_submission_form ON intake_submission (form_id, created_at DESC);

-- updated_at trigger (mirrors project_template / sprint). set_updated_at() defined
-- by an earlier migration; DROP-then-CREATE keeps this idempotent on re-run.
DROP TRIGGER IF EXISTS trg_intake_form_updated ON intake_form;
CREATE TRIGGER trg_intake_form_updated BEFORE UPDATE ON intake_form
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Grants for the web role (mirrors 0109's guarded grant block).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON intake_form TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON intake_submission TO "mgid-imperioncrm-web-prd";
  END IF;
END $$;

COMMIT;
