-- 0098 task dependencies / blocks-blocked-by (ADR-0065 B2, issue #336)
--
-- PM task structure B2 (ADR-0065): directed dependency links between tasks. A
-- predecessor BLOCKS a successor (equivalently, the successor is BLOCKED-BY the
-- predecessor). This is the data behind "A blocks B shows on both" and the
-- "closing project surfaces unmet blockers" acceptance.
--
-- One join table mirroring the shape ADR-0065 chose for task structure:
--   task_dependency — { predecessor_id, successor_id, type }, one row per directed
--   link. predecessor_id BLOCKS successor_id. Both are real FKs to task(id) (unlike
--   the polymorphic work_tag — dependencies are always task→task in v1), ON DELETE
--   CASCADE so deleting either endpoint removes the link (no dangling edges).
--
-- v1 is intentionally soft (ADR-0065 B2): a blocked item is FLAGGED and warns on
-- out-of-order start/close — it is NOT hard-blocked. So there is no trigger that
-- prevents closing a successor while a predecessor is open; the read layer computes
-- the unmet-blocker flag and the UI surfaces the warning.
--
-- Cycle prevention (ADR-0065 B2 "circular-dependency detection required") is
-- enforced in the APP, not the DB — the data layer walks the predecessor chain
-- (recursive CTE) and refuses a link that would close a loop, exactly as
-- reparentTask guards the subtask ancestor walk (B1). Two cheap structural guards
-- live here in the schema: a row can't depend on itself (CHECK), and the same
-- directed pair can't be inserted twice (PK). A↔B mutual links are rejected by the
-- app cycle guard, not the PK.
--
-- `type` is the dependency kind. v1 ships only 'blocks' (finish-to-start); the
-- column + CHECK exist so later kinds (e.g. finish-to-finish) are an additive
-- enum-style widening, not a new table.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here.
--
-- `task` / `task_dependency` are app-native operational state (not ingested silver
-- entities with a source-of-record contract — same as `task`/`work_tag`), so the
-- OKF semantic-layer gate does not apply: there is no concept file for them.

BEGIN;

-- ── task_dependency: directed blocks → blocked-by edges between tasks ──────────
-- predecessor_id BLOCKS successor_id. PK (predecessor_id, successor_id, type) makes
-- re-linking the same directed pair idempotent. The self-link CHECK is a structural
-- floor; full cycle prevention is the app's recursive-ancestor walk (ADR-0065 B2).
CREATE TABLE IF NOT EXISTS task_dependency (
  predecessor_id uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  successor_id   uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  type           text NOT NULL DEFAULT 'blocks' CHECK (type IN ('blocks')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (predecessor_id, successor_id, type),
  CONSTRAINT task_dependency_no_self CHECK (predecessor_id <> successor_id)
);
COMMENT ON TABLE task_dependency IS
  'Directed task dependency edges (ADR-0065 B2, #336): predecessor_id BLOCKS successor_id. PK makes a link idempotent; ON DELETE CASCADE from either task removes the edge. Self-links rejected by CHECK; cycles rejected by the app (recursive walk), not a DB trigger. type=blocks (finish-to-start) in v1; soft in v1 (blocked items flagged + warned, never hard-blocked).';

-- Covering index for the "what does this task block?" (successors) read; the PK
-- already covers the "what is this task blocked by?" (predecessor-led) lookups and
-- the per-successor predecessor read leads on successor_id, so index that too.
CREATE INDEX IF NOT EXISTS idx_task_dependency_successor
  ON task_dependency (successor_id);

COMMIT;
