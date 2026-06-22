-- 0167: memory_drawer — bronze verbatim conversation/agent memory (#1163, Phase 1, ADR-0113).
-- Migration number 0167 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; renumber if another migration merges first.
--
-- WHY THIS EXISTS. Verbatim NON-AGENT memory (ADR-0113): user-authored notes and captured
-- human conversations (e.g. a call/meeting not run through an agent), stored ORIGINAL-TEXT,
-- never summarized. AGENT-run transcripts are NOT here — they live in the existing Jarvis
-- ledger (`agent_conversation` → `agent_run` → `agent_message`, 0056/0163). The two verbatim
-- stores are SPLIT BY ORIGIN (Mark, 2026-06-21); both are bronze. Per the medallion
-- (CLAUDE.md §4) verbatim IS bronze — raw payload, no transform. The SUMMARY of each memory
-- conversation lives in GOLD (`knowledge_object`, `entity_type='memory'` /
-- `entity_ref=conversation_id`, embedded + hybrid-searchable via 0045/0166); retrieval is
-- two-level — search the gold summary, then DRILL to the verbatim rows via that reference.
-- Bronze carries NO embedding and NO tsvector — it is the faithful store you drill into, not
-- the search index.
--
-- ACCESS. Two-axis RLS (ADR-0105): personal drawers are owner-scoped (`owner_user_id` =
-- `app.user_id`) and invisible to other employees; agent/company drawers (`owner_user_id` NULL,
-- e.g. an agent's diary) are visible to any IDENTIFIED caller. Fine-grained `required_group`
-- role-scoping of company drawers is RESERVED here and enforced when access-spine slice 3a
-- (#979) lands — matching today's broad-employee-read posture (ADR-0100). App roles are
-- non-BYPASSRLS (verified live 2026-06-20) → the policy enforces; the table-owner admin keeps
-- the audited god-view by ownership.
--
-- Append-only (no updated_at): a verbatim turn is immutable once captured. Supersedes the
-- `personal_note` pilot (0153) as the real drawer.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until Mark runs it (each prod apply is Mark-gated). Verbatim rows are PII-bearing
-- user/client content — RLS is exactly the control; no row data appears here or in any doc.

BEGIN;

CREATE TABLE IF NOT EXISTS memory_drawer (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,                       -- groups the turns of one conversation/session/thread
  turn_index      integer,                             -- order within the conversation (NULL for a standalone note)
  turn_key        text UNIQUE,                          -- capture idempotency (sweep resume-safe); NULL for user notes (NULLs are distinct)
  wing            text NOT NULL,                        -- scope key: 'user:<uuid>' | 'project:<uuid>' (MemPalace wing; agent transcripts live in agent_message)
  room            text,                                 -- topic within the wing (scoped recall)
  owner_user_id   uuid REFERENCES app_user(id) ON DELETE CASCADE,  -- personal axis (RLS owner); NULL = company/shared
  required_group  text,                                 -- company axis (role slug) — RESERVED, enforced at slice 3a (#979)
  role            text,                                 -- speaker/kind: 'note' | 'user' | 'participant' | 'system'
  body            text NOT NULL,                        -- VERBATIM original text — no transform (bronze)
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,   -- raw capture context (channel, external ids) — capture provenance, NOT enrichment
  content_hash    text NOT NULL,                        -- dedup / idempotency (hash of body)
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE memory_drawer IS
  'Bronze verbatim NON-AGENT memory (ADR-0113): user notes + captured human conversations. '
  'Agent-run transcripts live in agent_message (0056/0163) — split by origin. One row = one '
  'original-text turn/note, never summarized. Gold summary in knowledge_object '
  '(entity_type=''memory'', entity_ref=conversation_id); recall drills gold->bronze. Two-axis '
  'RLS (ADR-0105): personal owner-scoped, company identified-read. PII-bearing.';

CREATE INDEX IF NOT EXISTS ix_memory_drawer_conversation ON memory_drawer (conversation_id, turn_index);
CREATE INDEX IF NOT EXISTS ix_memory_drawer_owner        ON memory_drawer (owner_user_id);
CREATE INDEX IF NOT EXISTS ix_memory_drawer_wing_room    ON memory_drawer (wing, room);

-- ── Row-level security: two-axis (owner + identified company), fail-closed ─────────────────
ALTER TABLE memory_drawer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memory_drawer_access ON memory_drawer;
CREATE POLICY memory_drawer_access ON memory_drawer
  USING (
    -- Personal drawer: owner-only. current_setting(...,true) is missing_ok → NULL when unset →
    -- predicate is false (fail-closed), never errors.
    (owner_user_id IS NOT NULL
      AND owner_user_id = current_setting('app.user_id', true)::uuid)
    OR
    -- Company/shared drawer (no personal owner): visible to any IDENTIFIED caller. Fine-grained
    -- required_group role-scoping is deferred to access-spine slice 3a (#979, ADR-0105).
    (owner_user_id IS NULL
      AND current_setting('app.user_id', true) IS NOT NULL)
  )
  WITH CHECK (
    (owner_user_id IS NOT NULL
      AND owner_user_id = current_setting('app.user_id', true)::uuid)
    OR
    (owner_user_id IS NULL
      AND current_setting('app.user_id', true) IS NOT NULL)
  );

-- ── Grants (defensive; roles may be absent in some envs) ──────────────────────────────────
DO $$
BEGIN
  -- Web: GUI reads + user-authored personal notes (owner = caller).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT ON memory_drawer TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  -- Backend: the capture/sweep loop writes turns; DELETE for retention/forgetting (#303).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, DELETE ON memory_drawer TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  -- LocalPipeline: reads verbatim rows to produce the gold summary (#300). Read-only here.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON memory_drawer TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
