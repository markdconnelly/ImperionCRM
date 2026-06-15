-- 9001 configurable statuses per project type (ADR-0065 B5, issue #339)
--
-- PLACEHOLDER NUMBER — the orchestrator renumbers this to the next free slot at
-- merge (concurrency contract §10.3); do not treat 9001 as final. Referenced as
-- 9001 in this header only.
--
-- PM task structure B5 (ADR-0065): today's status values are hard-coded — `task.status`
-- is a free `text` column (open|in_progress|done, 0007) and `project.status` is the
-- `project_status` enum (not_started|in_progress|blocked|complete, 0009). This blocks
-- admin-definable status sets per project type and forces reporting to key off literal
-- labels. ADR-0065 B5: introduce `status_def` (a per-scope / per-project_type set of
-- statuses, each carrying a `category` of todo|in_progress|done) and turn the status
-- columns into FKs to it, so adding "Waiting on client" to Onboarding becomes a row
-- insert that still rolls up as in_progress in reporting (acceptance criterion).
--
-- ── BACKWARD-SAFE / ADDITIVE STRATEGY (the compatibility window ADR-0065 calls for) ──
-- The existing `task.status` (text) and `project.status` (project_status enum) columns
-- are LEFT IN PLACE and authoritative for now. This migration:
--   1. creates `status_def` and seeds the DEFAULT sets that exactly reproduce today's
--      enum values (so NO DATA IS LOST and every current reader/writer keeps working);
--   2. adds NULLABLE FK columns `task.status_def_id` / `project.status_def_id`;
--   3. BACKFILLS those FKs from the current string/enum values via the seeded `key`,
--      so every existing row already points at the matching default status_def.
-- Writers stamping the FK on every mutation, the kanban board reading status_def
-- columns, reporting re-keying off `category` instead of labels, and the WIP-limit UI
-- are the broad consumer-surface re-key — split into follow-up sub-issues under #326
-- (see PR #339 body). They are additive on top of this; nothing here breaks the
-- string path, so the FK can be adopted incrementally behind seeded defaults.
--
-- Reporting re-keys off `category`, NOT labels (ADR-0065 tradeoff): the seeded
-- categories map blocked→in_progress and complete→done so a category rollup is
-- identical to today's label rollup until admins add custom statuses.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here.
--
-- OKF (§11): `task` and `project` are documented silver entities whose `status`
-- column shape changes (gains a status_def FK), so the matching concept files'
-- ## Schema + frontmatter timestamp are updated IN THIS PR (docs/database/
-- semantic-layer/tables/{task,project}.md). status_def itself is app-native
-- reference config (no source-of-record contract), so it gets no concept file.

BEGIN;

-- ── status_def: admin-definable status sets ──────────────────────────────────
-- scope:
--   'global'        — a default set shared by every project type / context;
--                     project_type_id IS NULL.
--   'project_type'  — a set scoped to one project type; project_type_id is the FK.
-- A status is identified by a stable machine `key` (e.g. 'in_progress'); `label`
-- and `color` are display-only and admin-editable. `category` is the reporting
-- partition (todo|in_progress|done) — rollups key off THIS, never the label.
-- `ordinal` orders columns on the board. `wip_limit` (ADR-0066 C1) is the optional
-- per-status work-in-progress cap surfaced on the kanban board (NULL = no limit).
-- `context` distinguishes the task set from the project set within one scope so a
-- project type can carry independent task-status and project-status columns.
CREATE TABLE IF NOT EXISTS status_def (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope           text NOT NULL DEFAULT 'global'
                    CHECK (scope IN ('global', 'project_type')),
  project_type_id uuid REFERENCES project_type(id) ON DELETE CASCADE,
  context         text NOT NULL DEFAULT 'task'
                    CHECK (context IN ('task', 'project')),
  key             text NOT NULL,
  label           text NOT NULL,
  color           text,
  category        text NOT NULL
                    CHECK (category IN ('todo', 'in_progress', 'done')),
  ordinal         integer NOT NULL DEFAULT 0,
  wip_limit       integer CHECK (wip_limit IS NULL OR wip_limit >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- scope/project_type_id must agree: a global row has no type, a typed row must
  -- name its type. Enforced so the two scopes can never be mixed up.
  CONSTRAINT status_def_scope_type_chk CHECK (
    (scope = 'global'       AND project_type_id IS NULL) OR
    (scope = 'project_type' AND project_type_id IS NOT NULL)
  )
);
COMMENT ON TABLE status_def IS
  'Admin-definable status set (ADR-0065 B5, #339). scope global|project_type; context task|project; category(todo|in_progress|done) is the reporting partition — rollups key off category, never label. Optional per-status wip_limit (ADR-0066 C1). task/project status columns FK here; default sets reproduce the legacy enums so no data is lost.';

DROP TRIGGER IF EXISTS trg_status_def_updated ON status_def;
CREATE TRIGGER trg_status_def_updated BEFORE UPDATE ON status_def
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A key is unique within one (context, scope, project_type_id). Global rows share
-- a NULL project_type_id, so a partial unique index covers them; typed rows are
-- unique per type. Two indexes because NULLs don't compare equal in a UNIQUE.
CREATE UNIQUE INDEX IF NOT EXISTS uq_status_def_global
  ON status_def (context, key)
  WHERE scope = 'global';
CREATE UNIQUE INDEX IF NOT EXISTS uq_status_def_typed
  ON status_def (context, project_type_id, key)
  WHERE scope = 'project_type';

-- Board read: ordered columns for a scope/context.
CREATE INDEX IF NOT EXISTS idx_status_def_lookup
  ON status_def (context, scope, project_type_id, ordinal);

-- ── seed the DEFAULT (global) sets reproducing today's enum values ───────────
-- TASK context (0007: open|in_progress|done). Idempotent via ON CONFLICT on the
-- global unique key.
INSERT INTO status_def (scope, context, key, label, color, category, ordinal) VALUES
  ('global', 'task', 'open',        'Open',        '#8A93A6', 'todo',        0),
  ('global', 'task', 'in_progress', 'In Progress', '#5B8DEF', 'in_progress', 1),
  ('global', 'task', 'done',        'Done',        '#3FBF8F', 'done',        2)
ON CONFLICT DO NOTHING;

-- PROJECT context (0009 project_status: not_started|in_progress|blocked|complete).
-- blocked→in_progress and complete→done so a category rollup matches today's label
-- rollup exactly.
INSERT INTO status_def (scope, context, key, label, color, category, ordinal) VALUES
  ('global', 'project', 'not_started', 'Not Started', '#8A93A6', 'todo',        0),
  ('global', 'project', 'in_progress', 'In Progress', '#5B8DEF', 'in_progress', 1),
  ('global', 'project', 'blocked',     'Blocked',     '#E2615A', 'in_progress', 2),
  ('global', 'project', 'complete',    'Complete',    '#3FBF8F', 'done',        3)
ON CONFLICT DO NOTHING;

-- ── add the FK columns (nullable, additive — legacy string columns stay) ─────
ALTER TABLE task
  ADD COLUMN IF NOT EXISTS status_def_id uuid REFERENCES status_def(id) ON DELETE SET NULL;
COMMENT ON COLUMN task.status_def_id IS
  'Configurable status (ADR-0065 B5, #339): FK → status_def. NULLABLE during the compatibility window — the legacy text `status` column remains authoritative until writers stamp this FK (follow-ups under #326). Backfilled from `status` via the seeded global task set.';

ALTER TABLE project
  ADD COLUMN IF NOT EXISTS status_def_id uuid REFERENCES status_def(id) ON DELETE SET NULL;
COMMENT ON COLUMN project.status_def_id IS
  'Configurable status (ADR-0065 B5, #339): FK → status_def. NULLABLE during the compatibility window — the legacy `project_status` enum column remains authoritative until writers stamp this FK (follow-ups under #326). Backfilled from `status` via the seeded global project set.';

CREATE INDEX IF NOT EXISTS idx_task_status_def    ON task (status_def_id);
CREATE INDEX IF NOT EXISTS idx_project_status_def ON project (status_def_id);

-- ── backfill the FKs from existing values (NO DATA LOSS) ─────────────────────
-- Every existing task/project row points at the matching seeded default status_def
-- so the FK is populated from day one. Only fills rows not already set (idempotent
-- re-run safety). Legacy `status` values that don't match a seeded key (none today)
-- are left NULL rather than guessed.
UPDATE task t
   SET status_def_id = sd.id
  FROM status_def sd
 WHERE sd.scope = 'global' AND sd.context = 'task'
   AND sd.key = t.status
   AND t.status_def_id IS NULL;

UPDATE project p
   SET status_def_id = sd.id
  FROM status_def sd
 WHERE sd.scope = 'global' AND sd.context = 'project'
   AND sd.key = p.status::text
   AND p.status_def_id IS NULL;

-- ── least-privilege grants (0045/0050/0058 defensive pattern) ────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON status_def TO "mgid-imperioncrm-web-prd";
  END IF;
END $$;

COMMIT;
