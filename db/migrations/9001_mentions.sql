-- 9001 [PLACEHOLDER — renumber at merge, §10.3] @mentions in comments (ADR-0064 A2)
-- PM collaboration A2 — @mention users inside a work comment (issue #331).
-- Builds on 0094 (work_comment, ADR-0064 A1, #330). The handle parsed from a
-- body (`@local-part`) resolves to an app_user; each resolved mention is
-- persisted as a row here linking comment -> mentioned user.
--
-- Why a join table (not a jsonb array on work_comment): a mention is a
-- resolvable REF (the acceptance: "saved comment links the mention"), and we
-- want to query "comments that mention me" cheaply (the future A3 notification
-- inbox / B3 auto-watch both read this surface). One row per (comment, user),
-- deduped by a UNIQUE constraint so re-saving an edited body is idempotent.
--
-- Notification (A2 acceptance "mentioned user is notified") is emitted by the
-- app as a `comment.mentioned` audit_log event per mention — durable, and it
-- already flows into work_activity_feed (0094). The dedicated A3 notification
-- inbox and B3 watcher auto-subscribe are separate issues; this migration adds
-- only the mention link + its read indexes, forward-compatible with both.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here.

BEGIN;

-- ── comment_mention: a resolved @mention linking a comment to an app_user ──────
-- comment_id FKs work_comment (CASCADE: a hard-purged comment drops its mentions;
-- soft-deletes leave the row, consistent with 0094's audit-retention model).
-- mention_user_id FKs app_user (SET NULL keeps the link if the user is removed,
-- mirroring work_comment.author_user_id). created_at orders an inbox read.
CREATE TABLE IF NOT EXISTS comment_mention (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id      uuid NOT NULL REFERENCES work_comment(id) ON DELETE CASCADE,
  mention_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- One link per (comment, user): re-saving an edited body re-parses without
  -- duplicating an existing mention (the app upserts on this constraint).
  CONSTRAINT uq_comment_mention UNIQUE (comment_id, mention_user_id)
);
COMMENT ON TABLE comment_mention IS
  'A resolved @mention on a work_comment (ADR-0064 A2, #331): links comment_id -> mention_user_id. One row per (comment, user). Drives the mention link in the UI and feeds the future A3 notification inbox / B3 auto-watch. Notification itself is emitted as a comment.mentioned audit_log event.';

-- Inbox read: "comments that mention user X", newest-first.
CREATE INDEX IF NOT EXISTS idx_comment_mention_user
  ON comment_mention (mention_user_id, created_at DESC);
-- Per-comment read: resolve the mentions to render on one comment.
CREATE INDEX IF NOT EXISTS idx_comment_mention_comment
  ON comment_mention (comment_id);

COMMIT;
