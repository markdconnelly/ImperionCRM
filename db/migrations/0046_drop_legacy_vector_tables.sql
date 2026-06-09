-- Drop the legacy 1536-dim vector tables (ADR-0043; backend ADR-0034).
--
-- The AI stack is settled (2026-06-09): Claude for generation, Voyage voyage-3-large @
-- 1024 dims for embeddings. The unified vector store is `knowledge_object` +
-- `knowledge_embedding` (migration 0045, ADR-0041) — one vector space, pinned contract.
--
-- `interaction_embedding` (0001) and `contact_embedding` (0021) were designed for the
-- old OpenAI text-embedding-3-small / 1536-dim plan, were NEVER populated (no embedding
-- provider was ever configured), and no longer have any reader: the backend's semantic
-- search and agent retrieval now query the gold store exclusively. Dropping them removes
-- the dual-vector-space liability instead of carrying a "converge later" task forever.
--
-- Idempotent. No data loss (verified empty before applying; they cannot have been
-- written — the only writer was never wired).

BEGIN;

DROP TABLE IF EXISTS interaction_embedding;
DROP TABLE IF EXISTS contact_embedding;

COMMIT;
