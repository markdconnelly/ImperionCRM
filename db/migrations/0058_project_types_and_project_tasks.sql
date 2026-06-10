-- 0058: Project types become data + tasks link to projects (ADR-0052, issue #95).
--
-- The project board creates projects of user-defined types, so the hard
-- two-value `project_type` enum becomes a table:
--   project_type — user-creatable categories; stable `key`, display `name`,
--                  `is_protected` (Onboarding is seeded protected — never
--                  deletable; its dedicated page keys off `key='onboarding'`).
--   project      — gains project_type_id (RESTRICT: a type in use cannot be
--                  deleted) + owner_user_id (ADR-0052 §8).
--   task         — gains project_id (SET NULL, the opportunity_id convention;
--                  one task model ever, ADR-0052 §2) + autotask_ticket_ref
--                  (set by the on-demand Autotask push, backend #19).
--
-- ORDER MATTERS: the old enum is also named `project_type`; it is renamed
-- before the table is created, and dropped once `project.type` is migrated.
--
-- Grants: app-owned tables — the web MI keeps its read/write path (defensive
-- grant below, 0045/0050 pattern). The other identities get nothing here; the
-- backend's verification grants arrive with the easy-mode slice (#101).
-- Idempotent throughout.

-- 1. Get the enum out of the way of the table name (first run only).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_type' AND typtype = 'e') THEN
    ALTER TYPE project_type RENAME TO project_type_enum_legacy;
  END IF;
END $$;

-- 2. The project_type table (ADR-0052 §1).
CREATE TABLE IF NOT EXISTS project_type (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,            -- stable machine key, e.g. 'onboarding'
  name         text NOT NULL UNIQUE,
  description  text,
  is_protected boolean NOT NULL DEFAULT false,  -- protected types are never deletable
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE project_type IS
  'User-creatable project types (ADR-0052). Onboarding is seeded protected; new types are a row insert from the project board, never a migration.';

DROP TRIGGER IF EXISTS trg_project_type_updated ON project_type;
CREATE TRIGGER trg_project_type_updated BEFORE UPDATE ON project_type
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO project_type (key, name, is_protected) VALUES
  ('onboarding',     'Onboarding',     true),
  ('implementation', 'Implementation', false)
ON CONFLICT (key) DO NOTHING;

-- 3. project: type as FK + an owner (ADR-0052 §1/§8).
ALTER TABLE project
  ADD COLUMN IF NOT EXISTS project_type_id uuid REFERENCES project_type(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS owner_user_id   uuid REFERENCES app_user(id) ON DELETE SET NULL;

-- Backfill from the legacy enum column, then retire it (first run only).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'project' AND column_name = 'type') THEN
    UPDATE project p SET project_type_id = pt.id
      FROM project_type pt
      WHERE pt.key = p.type::text AND p.project_type_id IS NULL;
    ALTER TABLE project ALTER COLUMN project_type_id SET NOT NULL;
    ALTER TABLE project DROP COLUMN type;
  END IF;
END $$;

DROP TYPE IF EXISTS project_type_enum_legacy;

CREATE INDEX IF NOT EXISTS idx_project_type ON project (project_type_id);

-- 4. task: project linkage + Autotask push ref (ADR-0052 §2/§7).
ALTER TABLE task
  ADD COLUMN IF NOT EXISTS project_id          uuid REFERENCES project(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS autotask_ticket_ref text;
COMMENT ON COLUMN task.project_id IS
  'The project this task belongs to (one task model, ADR-0052 §2). SET NULL on project delete, matching opportunity_id.';
COMMENT ON COLUMN task.autotask_ticket_ref IS
  'Autotask ticket ref returned by the on-demand push (backend #19, idempotency key imperioncrm-task-{id}). Never auto-created.';

CREATE INDEX IF NOT EXISTS task_project_idx ON task (project_id) WHERE project_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS task_autotask_ref_uniq ON task (autotask_ticket_ref)
  WHERE autotask_ticket_ref IS NOT NULL;

-- 5. Least-privilege grants (0045/0050 defensive pattern — do not rely on 0002's
-- ALTER DEFAULT PRIVILEGES having matched the migration-running role).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON project_type TO "mgid-imperioncrm-web-prd";
  END IF;
  -- Pipeline/backend/local identities: no access in this slice. The backend's
  -- task/onboarding_step verification grants ship with the easy-mode slice (#101).
END $$;
