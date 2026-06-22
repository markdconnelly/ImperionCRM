-- 0169: memory_drawer.agent_slug — per-agent attribution for the Universal Memory MCP
-- (#1170, Phase 4, ADR-0116). Migration number 0169 claimed at MERGE per system
-- CLAUDE.md §10.3 — authored against a placeholder; renumber if another migration merges first.
--
-- WHY THIS EXISTS. Phase 4 adds a write+recall memory MCP (store/recall/list_agents) so
-- Claude Code, Cursor, and the orchestrator share ONE governed brain (ADR-0116). The MCP's
-- `store` writes deliberate verbatim memories to `memory_drawer` (0167). Those callers ARE
-- agents, so §4's verbatim split is reframed from *non-agent* to *non-TRANSCRIPT deliberate
-- capture*: agent transcripts still live in `agent_message`, deliberate agent memories land
-- here. This needs one thing 0167 lacks — knowing WHICH agent authored/owns a row.
--
--   `agent_slug` (nullable) IS the authored-by-agent discriminator (`agent_slug IS NOT NULL`):
--     • Class 1 — Claude Code / Cursor on a human's machine: owner_user_id=<human>,
--       agent_slug='claude-code', wing 'user:<id>'  → owner-PRIVATE (agent held the pen,
--       the human is the author).
--     • Class 2/3 — autonomous orchestrator / named agent: owner_user_id=NULL,
--       agent_slug='felix', wing 'agent:<slug>'  → SHARED diary (company axis).
--   Pure human GUI note: owner_user_id=<human>, agent_slug=NULL (unchanged).
--
-- Free-text + convention (FK to a first-class agent registry deferred, ADR-0116). The `wing`
-- convention gains 'agent:<slug>' alongside 'user:<uuid>' / 'project:<uuid>' (convention only —
-- `wing` is already free text). NO RLS CHANGE: 0167's policy already does owner-present⇒
-- owner-only / owner-NULL⇒identified-company; agent diaries are the existing NULL-owner case.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until Mark runs it (each prod apply is Mark-gated). No backfill: existing rows
-- keep agent_slug NULL (correct — they are human/non-agent captures).

BEGIN;

ALTER TABLE memory_drawer
  ADD COLUMN IF NOT EXISTS agent_slug text;   -- authoring/owning agent (e.g. 'claude-code','cursor','felix'); NULL = human/non-agent. NOT NULL ⇒ authored-by-agent. Free-text + convention (ADR-0116).

COMMENT ON COLUMN memory_drawer.agent_slug IS
  'Authoring/owning agent slug for MCP/agent captures (ADR-0116): NULL = human note; '
  '''claude-code''/''cursor'' (Class 1, owner-private) | ''felix'' etc. (Class 2/3 autonomous, '
  'owner_user_id NULL, wing ''agent:<slug>'', shared diary). Free-text + convention; agent-registry FK deferred.';

-- list_agents (GET /api/memory/agents) does SELECT DISTINCT over readable namespaces; index the slug.
CREATE INDEX IF NOT EXISTS ix_memory_drawer_agent_slug ON memory_drawer (agent_slug) WHERE agent_slug IS NOT NULL;

-- Refresh the table comment's wing note to admit the agent: wing (convention only; no constraint change).
COMMENT ON TABLE memory_drawer IS
  'Bronze verbatim deliberate-capture memory (ADR-0113/0116): user notes + captured human '
  'conversations + deliberate agent memories (MCP store). Agent-run TRANSCRIPTS live in '
  'agent_message (0056/0163) — split by origin (transcript vs deliberate capture, §4 reframe). '
  'One row = one original-text turn/note, never summarized. wing: ''user:<uuid>'' | '
  '''project:<uuid>'' | ''agent:<slug>''. agent_slug = authoring agent (NULL = human). Gold '
  'summary in knowledge_object (entity_type=''memory'', entity_ref=conversation_id); recall '
  'drills gold->bronze. Two-axis RLS (ADR-0105): personal owner-scoped, company identified-read. PII-bearing.';

COMMIT;

-- Existing table-level grants (0167) cover the new column automatically; no grant changes.
-- Verify (run manually post-apply):
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='memory_drawer' AND column_name='agent_slug';
