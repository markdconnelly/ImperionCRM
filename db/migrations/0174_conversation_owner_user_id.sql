-- 0174: conversation.owner_user_id — the owning employee of a captured conversation
-- (#1207). Migration number 0174 claimed at MERGE (concurrency contract §10.3): authored
-- against a placeholder; if another migration merges during the CI window, take the next
-- free number and rename this file (a rename is data-safe).
--
-- WHY THIS EXISTS. The backend capture-sweep (ImperionCRM_Backend #344) drains a
-- transcribed conversation's diarized turns into the owning employee's PERSONAL brain
-- (`memory_drawer`, owner-scoped — ADR-0113/0116). That write needs an owner
-- (`memory_drawer.owner_user_id`, the RLS owner axis), but `conversation` (0112) carries
-- only account/contact/opportunity links — NO employee owner. So the sweep's v1 makes the
-- CALLER pass `ownerUserId`, which forces it to be on-demand HTTP only: an unattended timer
-- has no human and so no owner to attribute turns to.
--
-- This column closes that gap. The backend capture orchestrator (#376/#377, dormant until
-- ACS/Speech creds #66/#21) knows the owning employee (the meeting host / the per-user
-- connection that ingested the capture) and stamps it here; the sweep then resolves the
-- owner FROM the row, and a backend timer can drain `status='transcribed'` conversations
-- that carry an owner — unattended.
--
--   `owner_user_id` (nullable) — the owning employee (`app_user.id`). NULL for an unlinked /
--     pre-attribution capture (an upload before auto-linking, ADR-0068) — the sweep then
--     falls back to a caller-supplied owner, never guesses. ON DELETE SET NULL: removing an
--     employee orphans the attribution, never the conversation.
--
-- NO RLS CHANGE. `conversation` is a 360 silver entity read by account visibility, not
-- owner-scoped (a meeting is visible to whoever can see its account); this column is
-- attribution for the personal-memory sweep, not a read-scope. The two-axis RLS lives on
-- `memory_drawer` (0167), where the swept rows land.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until Mark runs it (each prod apply is Mark-gated). No backfill: there are no
-- conversation rows yet (the capture orchestrator is dormant), so existing rows (none/any)
-- correctly keep owner_user_id NULL.

BEGIN;

ALTER TABLE conversation
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL;

COMMENT ON COLUMN conversation.owner_user_id IS
  'Owning employee (app_user.id) of the captured conversation — the meeting host / the '
  'per-user connection that ingested it. Stamped by the backend capture orchestrator '
  '(#376/#377); the capture-sweep (backend #344) resolves the personal-brain owner from it '
  'and an unattended timer drains owner-bearing transcribed conversations. NULL = unlinked / '
  'pre-attribution (sweep falls back to a caller-supplied owner). Attribution only, not a '
  'read-scope (no RLS on conversation). ADR-0113/0116.';

-- Supports the future owner-scoped timer drain: transcribed conversations that carry an
-- owner, newest first. Partial so the many NULL-owner rows never bloat the index.
CREATE INDEX IF NOT EXISTS idx_conversation_owner_status
  ON conversation (owner_user_id, status) WHERE owner_user_id IS NOT NULL;

COMMIT;

-- Existing table-level grants (0112) cover the new column automatically; no grant changes.
-- Verify (run manually post-apply):
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='conversation' AND column_name='owner_user_id';
