-- 0107 sprint / backlog container (ADR-0069 D4, issue #349)
-- Migration number 0107 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration
-- merges during the CI window, renumber the file (rename is data-safe — see below).
--
-- Adds the sprint/iteration container that scopes a board to a fixed window of
-- work, plus a backlog (tasks with no sprint). Two additive pieces:
--
--   1. sprint (NEW silver table) — { id, name, project_id?, starts_at, ends_at,
--      status }. project_id is NULLABLE: a sprint may scope one project's work OR
--      cut across projects (a team iteration). status is a small lifecycle enum
--      planned → active → completed. A website-native operational object (no
--      external source-of-record); its OKF concept file ships in this PR
--      (docs/database/semantic-layer/tables/sprint.md), so §11 stays in sync.
--
--   2. task.sprint_id (FK → sprint, ON DELETE SET NULL) — which sprint a task is
--      committed to. NULL = backlog (the un-sprinted pool). SET NULL on delete so
--      removing a sprint returns its tasks to the backlog rather than deleting
--      work. The board for a sprint is `task WHERE sprint_id = :sprint`; the
--      backlog is `task WHERE sprint_id IS NULL`.
--
-- Carry-over (the #349 acceptance: "closing a sprint moves open items forward") is
-- a RUNTIME operation in the read/write layer (closeSprint), not schema — closing
-- sets status='completed' and reassigns its still-open tasks to the next planned
-- sprint in the same scope, or to the backlog (sprint_id = NULL) when there is none.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII (sprints + tasks are
-- internal work objects).
--
-- OKF semantic-layer gate: this migration `ALTER TABLE task` (a concept-bearing
-- silver entity), so the PR also bumps docs/database/semantic-layer/tables/task.md
-- (sprint_id column + join) to keep the curated meaning in sync (ADR-0086, #535).

BEGIN;

-- ── sprint: a time-boxed iteration / backlog container (ADR-0069 D4, #349) ───────
-- project_id nullable: scoped to one project OR cross-project. status is a small
-- lifecycle enum. starts_at/ends_at are dates (the planning window); both nullable
-- so a sprint can be drafted before its dates are set. CASCADE on project delete:
-- a project's sprints go with it (its tasks are already cascade-deleted with it).
CREATE TABLE IF NOT EXISTS sprint (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  project_id uuid REFERENCES project(id) ON DELETE CASCADE,  -- NULL = cross-project
  starts_at  date,
  ends_at    date,
  status     text NOT NULL DEFAULT 'planned'
             CHECK (status IN ('planned', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE sprint IS
  'Time-boxed iteration / backlog container (ADR-0069 D4, #349). Scopes a board to a fixed window of work. project_id NULLABLE — one project''s iteration or a cross-project team sprint. status: planned → active → completed. Website-native operational object (no external source-of-record). No client PII.';
COMMENT ON COLUMN sprint.project_id IS
  'Owning project, or NULL for a cross-project (team) sprint (ADR-0069 D4, #349). ON DELETE CASCADE — a project''s sprints go with the project.';
COMMENT ON COLUMN sprint.status IS
  'Sprint lifecycle (ADR-0069 D4, #349): planned (not yet started), active (the board scopes here), completed (closed; its open tasks were carried forward at close).';

-- Lookup: a project's sprints by status (list / pick the active one).
CREATE INDEX IF NOT EXISTS idx_sprint_project ON sprint (project_id, status);

-- ── task.sprint_id: which sprint a task is committed to (NULL = backlog) ─────────
-- ON DELETE SET NULL: deleting a sprint returns its tasks to the backlog, never
-- deletes work.
ALTER TABLE task
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES sprint(id) ON DELETE SET NULL;
COMMENT ON COLUMN task.sprint_id IS
  'Sprint this task is committed to (ADR-0069 D4, #349), FK → sprint. NULL = backlog (un-sprinted). A sprint''s board is task WHERE sprint_id = :sprint. ON DELETE SET NULL — removing a sprint returns its tasks to the backlog.';

-- The board read: a sprint's tasks. Partial-friendly composite for the common
-- "this sprint's open work" scan.
CREATE INDEX IF NOT EXISTS idx_task_sprint ON task (sprint_id, status);

-- updated_at trigger (mirrors goal/0102 etc.). set_updated_at() is defined by an
-- earlier migration; the DROP-then-CREATE keeps this idempotent on re-run.
DROP TRIGGER IF EXISTS trg_sprint_updated ON sprint;
CREATE TRIGGER trg_sprint_updated BEFORE UPDATE ON sprint
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Grants for the web role (mirrors 0102's guarded grant block).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON sprint TO "mgid-imperioncrm-web-prd";
  END IF;
END $$;

COMMIT;
