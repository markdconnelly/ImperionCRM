-- 9001 multiple assignees & watchers (ADR-0065 B3, issue #337)
-- PLACEHOLDER NUMBER (9001) — the orchestrator renumbers this to the next free
-- slot at merge (concurrency contract §10.3); do NOT treat 9001 as final. At the
-- time of authoring the highest repo migration is 0098, so the real number is
-- claimed at merge (expected 0099) after rebasing on main.
--
-- PM task-structure B3 (ADR-0065): a work object keeps ONE primary owner but can
-- carry many additional assignees plus watchers. Rather than widen the single
-- `task.owner_user_id` FK, this introduces a polymorphic join `work_assignment`
-- that records (parent_type, parent_id, user_id, role) — the same polymorphic
-- shape ADR-0064 chose for `work_comment` (0094) and `work_tag` (0096). The role
-- enum is primary | assignee | watcher:
--   * primary  — the single owner that still drives rollups, the Sales Queue, and
--                RBAC (acceptance: "primary still drives reporting"). Exactly one
--                primary per object is enforced by a partial unique index.
--   * assignee — an additional person doing the work; sees the item + gets
--                relevant notifications.
--   * watcher  — a follower; sees the item + gets notifications but is not an owner.
--
-- `task.owner_user_id` (0007) REMAINS the structural primary owner — it still
-- backs the existing owner FK, the Sales Queue (ADR-0052 §6), and every current
-- read. work_assignment is ADDITIVE: the primary row is mirrored here so the
-- assignees/watchers UI and future notification fan-out have one place to read
-- "everyone attached to this work", while legacy reads keep using owner_user_id
-- unchanged. Existing `task.owner_user_id` values are backfilled into a `primary`
-- row below (acceptance: "migrate existing owner_user_id → primary rows").
--
-- parent_type is bounded to the work objects assignments attach to (CHECK); there
-- is no DB-level FK on parent_id (polymorphic — same tradeoff as work_comment /
-- work_tag: the app validates the parent exists before insert). Deleting the
-- referenced app_user cascades the assignment row (ON DELETE CASCADE on user_id)
-- so no orphan rows remain after a user is removed.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here.
--
-- `task` is app-native operational state (not an ingested silver entity with a
-- source-of-record contract — same as `work_comment` / `work_tag`), so the OKF
-- semantic-layer gate does not apply: there is no concept file for `task`/
-- `work_assignment`.

BEGIN;

-- ── work_assignment: polymorphic people-on-work join ─────────────────────────
-- One row per (parent_type, parent_id, user_id): a user is attached to a work
-- object in exactly one role at a time. PK makes re-attaching idempotent and lets
-- a role change be an UPDATE (or upsert) rather than a duplicate. ON DELETE
-- CASCADE on user_id removes a person's attachments when their app_user is deleted.
CREATE TABLE IF NOT EXISTS work_assignment (
  parent_type  text NOT NULL CHECK (parent_type IN ('task', 'project')),
  parent_id    uuid NOT NULL,
  user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'assignee'
                 CHECK (role IN ('primary', 'assignee', 'watcher')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_type, parent_id, user_id)
);
COMMENT ON TABLE work_assignment IS
  'People attached to a work object (task|project), ADR-0065 B3 / #337. role: primary (the single owner driving rollups/RBAC) | assignee (additional worker) | watcher (follower). PK (parent_type,parent_id,user_id) makes attaching idempotent; ON DELETE CASCADE from app_user clears a removed user. No FK on parent_id (polymorphic, same tradeoff as work_comment/work_tag).';

-- Exactly one primary per work object: the single owner that still drives rollups
-- and RBAC (acceptance: "primary still drives reporting"). A partial unique index
-- enforces it without constraining assignee/watcher rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_assignment_primary
  ON work_assignment (parent_type, parent_id)
  WHERE role = 'primary';

-- Covering index for the per-object people read (assignee chips + watch state) and
-- for the future "everything assigned to / watched by user X" fan-out.
CREATE INDEX IF NOT EXISTS idx_work_assignment_user
  ON work_assignment (user_id, parent_type, parent_id);

-- ── backfill: existing task owners become primary rows ───────────────────────
-- Mirror every task that has an owner into a `primary` work_assignment row so the
-- new surface and the legacy task.owner_user_id agree from day one. Idempotent —
-- ON CONFLICT DO NOTHING means a re-run (or a row already added by the app) is a
-- no-op; existing-primary rows are never overwritten.
INSERT INTO work_assignment (parent_type, parent_id, user_id, role)
SELECT 'task', t.id, t.owner_user_id, 'primary'
FROM task t
WHERE t.owner_user_id IS NOT NULL
ON CONFLICT (parent_type, parent_id, user_id) DO NOTHING;

COMMIT;
