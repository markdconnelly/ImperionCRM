-- 9001 task hierarchy / subtasks (ADR-0065 B1, issue #335)
-- PLACEHOLDER NUMBER — the orchestrator renumbers this to the next free slot at
-- merge (concurrency contract §10.3); do not treat 9001 as final.
--
-- PM task structure B1 (ADR-0065): a task can have child tasks. Adds a nullable
-- self-FK `parent_task_id` plus a sibling `ordinal` for ordering. One level is
-- required by the spec; arbitrary depth is allowed by the schema (no depth
-- constraint). Parent progress rollup (n/m done) is computed in the read layer,
-- not stored. Auto-complete-on-children is MANUAL in v1 (ADR-0065: auto only via
-- the out-of-scope rules engine) — so there is no trigger here that flips a
-- parent done.
--
-- `onboarding_step` COEXISTS for now (ADR-0065 B1-F4 decision: coexist); unifying
-- steps as a task `kind` is a tracked follow-up, not this change.
--
-- Reparenting/promote/demote and reorder are plain UPDATEs of these two columns
-- through the audited `delivery:write` mutation path; the app rejects making a
-- task its own ancestor (cycle guard) before issuing the UPDATE.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here.
--
-- `task` is app-native (silver-adjacent operational state, not an ingested silver
-- entity with a source-of-record contract), so the OKF semantic-layer gate does
-- not apply — there is no concept file for `task`.

BEGIN;

-- ── self-referential parent + sibling ordering ───────────────────────────────
-- parent_task_id: the task this is a child of (NULL = top-level). ON DELETE
-- CASCADE so deleting a parent removes its subtree — consistent with the existing
-- account/project cascades on `task` and the "a subtask has no life without its
-- parent" semantics. ordinal orders siblings within one parent (and top-level
-- tasks among themselves); lower sorts first, ties fall back to title.
ALTER TABLE task
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES task(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ordinal        integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN task.parent_task_id IS
  'Subtask parent (ADR-0065 B1, #335): the task this is a child of; NULL = top-level. Self-FK, ON DELETE CASCADE (deleting a parent removes its subtree). Arbitrary depth allowed; cycle prevention is enforced in the app, not the DB.';
COMMENT ON COLUMN task.ordinal IS
  'Sibling ordering (ADR-0065 B1, #335): orders children within one parent (and top-level tasks among themselves); lower first, title breaks ties.';

-- Covering index for the per-parent children read (ordered).
CREATE INDEX IF NOT EXISTS idx_task_parent
  ON task (parent_task_id, ordinal);

COMMIT;
