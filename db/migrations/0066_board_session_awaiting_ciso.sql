-- 0066: board_session gains the 'awaiting_ciso' pause status (+ paused_at) — #208.
--
-- Resumable deputy-pause flow (ADR-0054 §4 second stage; v1 gate 8 per the
-- ADR-0057 recut): when a deputy-CISO seat sat the session and no convene-time
-- CISO position was given, the backend pauses the deliberation after round 2 —
-- status 'awaiting_ciso' — for the human CISO to approve/amend the deputy draft
-- before synthesis (backend issue #64; the deputy draft lives in board_message,
-- resume reconstructs finals from the transcript). Migration 0059 explicitly
-- deferred this status value to "the v2 resumable-session migration"; ADR-0057
-- pulled resumable sessions into v1, so it is now due.
--
-- No grant changes: the backend MI already holds SELECT/INSERT/UPDATE on
-- board_session (0056); the web role reads via 0002's default privileges.
--
-- Idempotent (constraint re-created only if it lacks the new value; column is
-- IF NOT EXISTS), transactional, additive. Unblocks backend #64 → frontend #185.

BEGIN;

DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conrelid = 'board_session'::regclass
    AND conname = 'board_session_status_check';

  IF def IS NULL OR def NOT LIKE '%awaiting_ciso%' THEN
    ALTER TABLE board_session DROP CONSTRAINT IF EXISTS board_session_status_check;
    ALTER TABLE board_session ADD CONSTRAINT board_session_status_check
      CHECK (status IN ('open', 'deliberating', 'awaiting_ciso', 'concluded', 'failed'));
  END IF;
END $$;

-- When the pause began — the deputy-review SLA clock (#185 surfaces it).
ALTER TABLE board_session ADD COLUMN IF NOT EXISTS paused_at timestamptz;

COMMENT ON COLUMN board_session.paused_at IS
  'Set when the session enters awaiting_ciso (deputy pause, ADR-0054 §4 / backend #64); cleared semantics owned by the backend resume path.';

COMMIT;
