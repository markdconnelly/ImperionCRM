-- 9001 tags / labels (ADR-0065 B6, issue #340)
-- PLACEHOLDER NUMBER — the orchestrator renumbers this to the next free slot at
-- merge (concurrency contract §10.3); do not treat 9001 as final.
--
-- PM task-structure B6 (ADR-0065): free-form, colour-coded tags with a GLOBAL
-- vocabulary, applied to work objects (tasks / projects) across the system, so a
-- user can tag work "urgent" everywhere and then filter any view by that tag.
-- This is DISTINCT from `task.category` (the fixed sales|project|onboarding|general
-- partition, ADR-0034) — a tag is an ad-hoc cross-cutting label, a category is the
-- task's home lane.
--
-- Two tables, mirroring the polymorphic shape ADR-0064 chose for work_comment
-- (0094):
--   * tag       — the global vocabulary: one row per distinct label + colour.
--   * work_tag  — the polymorphic join: (tag_id, parent_type, parent_id) applies a
--                 tag to one work object. No DB-level FK on parent_id (polymorphic);
--                 a CHECK bounds parent_type to the work objects tags attach to and
--                 the app validates the parent exists before insert (same tradeoff
--                 as work_comment).
--
-- RENAME is an UPDATE of tag.label. MERGE (fold tag B into tag A) is: repoint B's
-- work_tag rows onto A (skipping rows that would collide on the unique key), then
-- delete tag B — both done in the data layer inside one transaction. Deleting a tag
-- cascades its work_tag rows (ON DELETE CASCADE) so no orphan applications remain.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here.
--
-- `tag`/`work_tag` are app-native operational state (not ingested silver entities
-- with a source-of-record contract — same as `task`/`work_comment`), so the OKF
-- semantic-layer gate does not apply: there is no concept file for them.

BEGIN;

-- ── tag: the global label vocabulary ─────────────────────────────────────────
-- label is unique (case-insensitively) so the vocabulary is global and a label
-- exists once; colour is a token name resolved by the UI against the design-token
-- palette (no raw hex coupling). created_by is informational only.
CREATE TABLE IF NOT EXISTS tag (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  color       text NOT NULL DEFAULT 'slate',   -- design-token name (accent|green|amber|red|slate|...)
  created_by  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE tag IS
  'Global tag/label vocabulary (ADR-0065 B6, #340): one row per distinct colour-coded label, reused across all work objects. Distinct from task.category (the fixed lane). color is a design-token name resolved by the UI.';
-- One label, globally (case-insensitive) — the vocabulary is shared, so "Urgent"
-- and "urgent" are the same tag. Enforces the global-vocabulary requirement.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tag_label_ci ON tag (lower(label));

-- ── work_tag: polymorphic application of a tag to one work object ─────────────
-- parent_type discriminates the work object kind; parent_id is its uuid. No FK on
-- parent_id (polymorphic, ADR-0064 tradeoff). Deleting a tag cascades these rows.
CREATE TABLE IF NOT EXISTS work_tag (
  tag_id       uuid NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  parent_type  text NOT NULL CHECK (parent_type IN ('task', 'project')),
  parent_id    uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tag_id, parent_type, parent_id)
);
COMMENT ON TABLE work_tag IS
  'Polymorphic application of a tag to a work object (task|project), ADR-0065 B6 / #340. PK (tag_id,parent_type,parent_id) makes a tagging idempotent; ON DELETE CASCADE from tag removes applications when a tag is deleted. No FK on parent_id (polymorphic).';
-- Covering index for the "all work objects carrying tag X" filter read (the B6
-- acceptance: filter all urgent work) and for the per-object tag-chip read.
CREATE INDEX IF NOT EXISTS idx_work_tag_parent
  ON work_tag (parent_type, parent_id);

COMMIT;
