-- 9001 (PLACEHOLDER — orchestrator renumbers at merge, system CLAUDE.md §10.3):
-- PM collaboration A1 — polymorphic comments + activity feed on task/project/
-- milestone (ADR-0064, issue #330). First slice of ADR-0064; mentions (A2),
-- notifications (A3) and attachments (A4) are separate issues/migrations.
--
-- ADR-0064 chose the POLYMORPHIC model: ONE work_comment table reused across
-- every work object instead of per-entity comment tables. Parent integrity is
-- enforced by a CHECK on parent_type + application validation + a covering index
-- on (parent_type, parent_id) — the reuse outweighs losing a parent FK for an
-- internal tool.
--
-- The activity feed is a READ-ONLY view (work_activity_feed) interleaving live
-- (non-deleted) comments with audit_log system events for the same object, so a
-- comment and a status change surface in one newest-first stream. Comments
-- soft-delete (deleted_at) so the audit trail is retained (NFR-2).
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here.

BEGIN;

-- ── work_comment: polymorphic markdown comment on a work object ───────────────
-- parent_type discriminates which work object the comment hangs off; parent_id is
-- the uuid of that object. No DB-level FK (polymorphic, ADR-0064 tradeoff) — the
-- CHECK bounds the type set and the app validates the parent exists before insert.
CREATE TABLE IF NOT EXISTS work_comment (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type    text NOT NULL
                   CHECK (parent_type IN ('task', 'project', 'milestone')),
  parent_id      uuid NOT NULL,
  author_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  body           text NOT NULL,                       -- markdown, rendered client-side
  edited_at      timestamptz,                         -- set when the author edits in place
  deleted_at     timestamptz,                         -- soft-delete; retains audit (NFR-2)
  created_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE work_comment IS
  'Polymorphic markdown comment on a work object (task|project|milestone), ADR-0064 A1. parent_type+parent_id identify the object (no FK — polymorphic). Soft-deleted via deleted_at so the activity trail is retained.';
-- Covering index for the per-object feed read (newest-first), live rows only.
CREATE INDEX IF NOT EXISTS idx_work_comment_parent
  ON work_comment (parent_type, parent_id, created_at DESC);

-- ── work_activity_feed: the unified per-object activity stream ────────────────
-- A read view interleaving live comments with audit_log system events for the
-- SAME object. kind discriminates the two; entity_type/entity_id on audit_log map
-- onto parent_type/parent_id. The app filters by (parent_type, parent_id) and
-- optionally by kind ('comment' only vs all), then paginates newest-first.
CREATE OR REPLACE VIEW work_activity_feed AS
  SELECT
    c.id,
    'comment'::text          AS kind,
    c.parent_type,
    c.parent_id,
    c.author_user_id         AS actor_user_id,
    c.body,
    NULL::text               AS action,
    NULL::jsonb              AS detail,
    c.edited_at,
    c.created_at             AS occurred_at
  FROM work_comment c
  WHERE c.deleted_at IS NULL
  UNION ALL
  SELECT
    a.id,
    'event'::text            AS kind,
    a.entity_type            AS parent_type,
    a.entity_id              AS parent_id,
    a.actor_user_id,
    NULL::text               AS body,
    a.action,
    a.detail,
    NULL::timestamptz        AS edited_at,
    a.occurred_at
  FROM audit_log a
  WHERE a.entity_type IN ('task', 'project', 'milestone')
    AND a.entity_id IS NOT NULL;
COMMENT ON VIEW work_activity_feed IS
  'Unified per-object activity feed (ADR-0064 A1): live work_comment rows UNION audit_log system events for the same work object, discriminated by kind (comment|event). Read newest-first by occurred_at, filtered by (parent_type, parent_id).';

COMMIT;
