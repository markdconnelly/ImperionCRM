-- 0104 task time tracking, estimates, start_at + user capacity
-- (ADR-0069 D1 time-tracking / D2 capacity, ADR-0065/0066 start_at; issues #346, #580)
-- Migration number 0104 claimed at merge (concurrency contract §10.3). Single
-- migration for the Wave 13 fan-out (one migration-author per wave).
--
-- Bundles four additive, independent pieces of operational schema:
--
--   1. task.estimate + task.estimate_unit (ADR-0069 D1, #346) — a per-task
--      effort estimate. `estimate` is a bare numeric (nullable = un-estimated);
--      `estimate_unit` is free text configured per project_type ('hours' |
--      'points' | …) so a points-based and an hours-based project can coexist on
--      the one task object. The unit is NOT a hard enum — projects choose their
--      own; the app supplies sensible defaults. Estimate-vs-logged remaining is
--      COMPUTED in the read layer (logged minutes summed from time_entry), not
--      stored, so it never drifts.
--
--   2. task.start_at (ADR-0065/0066, #580) — a nullable `date`. The shared
--      prerequisite for the calendar WEEK view + start→due span bars (#342 C2)
--      and the timeline / gantt bars (#343 C3), which until now could only
--      render the existing task.due_at point. #342 deliberately shipped no
--      migration (the migration-author rule); this issue owns the schema add.
--
--   3. time_entry (ADR-0069 D1, #346) — one logged block of work against a task.
--      minutes is the unit of record (an int — UI collects hours/minutes and
--      converts) so rollups sum cleanly. started_at is optional (manual entry
--      need not say *when*); billable defaults false (an internal task logs
--      non-billable time unless flagged). The project/milestone rollup sums
--      minutes across a project's tasks in the read layer — no stored aggregate.
--
--   4. user_capacity (ADR-0069 D2) — weekly available hours per employee, the
--      denominator the workload / capacity view (#347, PARALLEL lane #591)
--      divides estimated load against. This migration only CREATES the table so
--      the #591 lane can consume it; no capacity UI is built here.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here (time_entry /
-- user_capacity key on the EMPLOYEE'S app_user; tasks are internal work objects).
--
-- `task` is app-native (silver-adjacent operational state, not an ingested silver
-- entity with a source-of-record contract), so the OKF semantic-layer gate does
-- not apply — there is no concept file for `task`. `time_entry` and
-- `user_capacity` are likewise app-native operational tables (same as
-- work_comment / work_assignment / notification — migrations 0094/0099/0101), so
-- the gate does not apply to them either: no concept files, no coverage-matrix rows.

BEGIN;

-- ── task: estimate + unit + start date ───────────────────────────────────────
-- estimate: nullable numeric effort estimate (NULL = un-estimated). estimate_unit:
-- the unit that estimate is expressed in, configurable per project_type ('hours' |
-- 'points' | …); NULL alongside a NULL estimate. start_at: nullable date, the
-- other end of a task's span for the calendar week view + timeline bars (#580).
ALTER TABLE task
  ADD COLUMN IF NOT EXISTS estimate      numeric,
  ADD COLUMN IF NOT EXISTS estimate_unit text,
  ADD COLUMN IF NOT EXISTS start_at      date;

COMMENT ON COLUMN task.estimate IS
  'Per-task effort estimate (ADR-0069 D1, #346): a bare numeric, NULL = un-estimated. Expressed in task.estimate_unit. Estimate-vs-logged remaining is computed in the read layer from time_entry, not stored.';
COMMENT ON COLUMN task.estimate_unit IS
  'Unit task.estimate is expressed in (ADR-0069 D1, #346): configurable per project_type, e.g. ''hours'' | ''points''. Free text, not a hard enum, so hours- and points-based projects coexist; NULL when there is no estimate.';
COMMENT ON COLUMN task.start_at IS
  'Task start date (ADR-0065/0066, #580): nullable date, the other end of a task''s span. Drives the calendar week view + start→due span bars (#342 C2) and the timeline/gantt bars (#343 C3); the existing task.due_at is the end. NULL = no explicit start (renders as a point on due_at).';

-- ── time_entry: one logged block of work against a task (ADR-0069 D1, #346) ───
-- task_id FKs task (CASCADE: deleting a task clears its logged time). user_id is
-- the EMPLOYEE who logged it (FK app_user). minutes is the unit of record (int) so
-- project rollups sum cleanly. started_at is optional (manual entry need not say
-- when). billable defaults false — internal time unless explicitly flagged.
CREATE TABLE IF NOT EXISTS time_entry (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  minutes    integer NOT NULL CHECK (minutes > 0),  -- logged duration; positive
  started_at timestamptz,                            -- optional: when the work happened
  note       text,                                   -- optional free-text note
  billable   boolean NOT NULL DEFAULT false,         -- internal unless flagged
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE time_entry IS
  'One logged block of work against a task (ADR-0069 D1, #346). minutes (int, >0) is the unit of record so project/milestone rollups sum cleanly; started_at optional (manual entry need not say when); billable defaults false (internal time unless flagged). user_id is the EMPLOYEE who logged it. No client PII (tasks are internal work objects).';

-- Per-task entry list (newest-first) + the per-task logged-minutes rollup.
CREATE INDEX IF NOT EXISTS idx_time_entry_task
  ON time_entry (task_id, created_at DESC);
-- Per-user time read (e.g. "my logged time"); supports a future capacity actuals view.
CREATE INDEX IF NOT EXISTS idx_time_entry_user
  ON time_entry (user_id, started_at);

-- ── user_capacity: weekly available hours per employee (ADR-0069 D2) ──────────
-- One row per employee, keyed on app_user (PK = upsert). weekly_hours is the
-- capacity denominator the workload view (#347, lane #591) divides load against.
-- Authored here so the #591 lane can consume it; NO capacity UI is built in this
-- change. ON DELETE CASCADE clears a removed employee's row.
CREATE TABLE IF NOT EXISTS user_capacity (
  user_id      uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  weekly_hours numeric NOT NULL DEFAULT 40,  -- available hours per week
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE user_capacity IS
  'Weekly available hours per EMPLOYEE (ADR-0069 D2): the capacity denominator the workload/capacity view (#347) divides estimated load against. PK on app_user (upsert). Authored by the #346 migration so the parallel #591 lane can consume it; no capacity UI ships here. No client PII (employees only).';

COMMIT;
