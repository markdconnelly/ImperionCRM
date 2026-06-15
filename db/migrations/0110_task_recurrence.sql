-- 0110 recurring tasks (ADR-0070 E2, #353)
-- Migration number 0110 claimed at merge (concurrency contract §10.3). Single
-- migration for the Wave 18 fan-out (one migration-author per wave).
--
-- One row per recurring SERIES, attached to the series' currently-live task. When
-- that task is completed the backend/app spawns the next instance (with the right
-- due date) and RE-POINTS this row at the new task — so the row always names the
-- one open occurrence and "complete the same task twice" can never double-spawn
-- (the idempotency guard: a re-completed task no longer owns the recurrence row).
--
--   * task_id   — UNIQUE: at most one active series per live task. ON DELETE
--                 CASCADE so deleting the task clears its recurrence.
--   * rule      — an RFC-5545 RRULE *subset* string the GUI authors and the app
--                 parses: FREQ=DAILY|WEEKLY|MONTHLY plus INTERVAL=n (see
--                 src/lib/recurrence.ts). Stored as text — no RRULE engine in the
--                 DB; next-date math lives in the app (DST-safe UTC date math).
--   * next_run_at — the DUE DATE of the next occurrence to spawn (a bare date).
--   * ends_at   — optional series end date (NULL = no date bound). The series
--                 stops once next_run_at would pass ends_at.
--   * count_remaining — optional cap on how many MORE occurrences to spawn
--                 (NULL = unbounded). Decremented on each spawn; the series stops
--                 (row deleted) when it reaches 0. The GUI's "end after N more
--                 occurrences" maps straight onto this count.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII (tasks are internal
-- work objects; this only carries a schedule).
--
-- `task` is app-native operational state (not an ingested silver entity with a
-- source-of-record contract), so the OKF semantic-layer gate does not apply —
-- there is no concept file for `task`, and `task_recurrence` is likewise an
-- app-native operational table (same as time_entry / work_comment / notification —
-- migrations 0105/0094/0101): no concept file, no coverage-matrix row.

BEGIN;

CREATE TABLE IF NOT EXISTS task_recurrence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL UNIQUE REFERENCES task(id) ON DELETE CASCADE,
  rule            text NOT NULL,            -- RRULE subset: FREQ=…;INTERVAL=n
  next_run_at     date NOT NULL,            -- due date of the next occurrence to spawn
  ends_at         date,                     -- optional series end (NULL = no date bound)
  count_remaining integer CHECK (count_remaining IS NULL OR count_remaining >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE task_recurrence IS
  'One recurring task SERIES (ADR-0070 E2, #353), attached to its currently-live task (task_id UNIQUE). On completion the app spawns the next instance with due=next_run_at and re-points this row at the new task (idempotent: a re-completed task no longer owns the row). rule = RRULE subset (FREQ=DAILY|WEEKLY|MONTHLY;INTERVAL=n) parsed by the app. ends_at / count_remaining bound the series (either NULL = unbounded). No client PII.';

-- The hot read: "does this task own a series?" (edit-page section + the
-- completion-spawn lookup). task_id is already UNIQUE-indexed, which serves it.

COMMIT;
