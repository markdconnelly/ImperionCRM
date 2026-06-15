-- 0108 project baseline / planned-vs-actual (ADR-0069 D6, issue #351)
-- Migration number 0108 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration
-- merges during the CI window, renumber the file (rename is data-safe).
--
-- Captures a project's *planned* dates at a moment in time (a "baseline"), so a
-- finished project can be measured against the plan it was committed to:
-- planned-vs-actual slippage (the #351 acceptance — a project completed two weeks
-- late shows +14d vs its baseline). One additive piece:
--
--   project_baseline (NEW silver table) — { id, project_id, captured_at,
--     planned_dates jsonb }. An IMMUTABLE snapshot: the project's target go-live
--     plus its tasks' due dates at capture time, frozen in `planned_dates`. A
--     project may be baselined more than once (re-baseline after a scope change);
--     slippage is measured against the LATEST baseline. There is no updated_at /
--     no UPDATE path — a baseline is never edited, only captured or superseded.
--
-- Why a jsonb snapshot rather than columns: the plan is a point-in-time copy of
-- dates that live elsewhere (project.target_live_date, task.due_at). Freezing them
-- in jsonb keeps the baseline true even as the live rows move, with no schema
-- coupling to the task table. Slippage (actual completion − planned go-live, and
-- per-task current-due − planned-due) is computed in the read layer, not stored.
--
--   planned_dates shape (written by captureProjectBaseline):
--     { "targetLiveDate": "2026-07-01" | null,
--       "status": "in_progress",
--       "tasks": [ { "id": uuid, "title": text, "dueAt": "2026-06-20" | null }, … ] }
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets; no client PII (projects/tasks are
-- internal delivery objects — task titles can name client work, kept out of docs).
--
-- OKF semantic-layer gate: this migration only CREATEs a new silver table (it does
-- not alter an existing concept-bearing table), so it ships its own concept file
-- docs/database/semantic-layer/tables/project_baseline.md + a coverage-matrix row
-- + an index row in this PR (ADR-0086, #535).

BEGIN;

-- ── project_baseline: an immutable snapshot of a project's planned dates ─────────
-- captured_at is the snapshot time. planned_dates freezes target go-live + task
-- due dates as they stood. CASCADE on project delete: a project's baselines go
-- with it. No updated_at — baselines are write-once.
CREATE TABLE IF NOT EXISTS project_baseline (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  captured_at   timestamptz NOT NULL DEFAULT now(),
  planned_dates jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE project_baseline IS
  'Immutable snapshot of a project''s planned dates at capture time (ADR-0069 D6, #351): target go-live + task due dates frozen in planned_dates jsonb. Enables planned-vs-actual slippage measured against the latest baseline. Write-once (no updated_at). Website system of record; no external source. No client PII.';
COMMENT ON COLUMN project_baseline.planned_dates IS
  'Frozen plan (ADR-0069 D6, #351): { targetLiveDate, status, tasks:[{id,title,dueAt}] } as the project/tasks stood at captured_at. Slippage (actual − planned) is computed in the read layer, not stored here.';

-- Lookup: a project's baselines newest-first (the latest is the one slippage uses).
CREATE INDEX IF NOT EXISTS idx_project_baseline_project
  ON project_baseline (project_id, captured_at DESC);

-- Grants for the web role (mirrors 0107's guarded grant block).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON project_baseline TO "mgid-imperioncrm-web-prd";
  END IF;
END $$;

COMMIT;
