-- 0166: hybrid-search substrate on the gold vector store (#1153, Phase 0).
-- Migration number 0166 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; renumber if another migration merges first.
--
-- WHY THIS EXISTS. The gold vector store (`knowledge_object` / `knowledge_embedding`,
-- migration 0045, ADR-0041) already has HNSW cosine vector search. The unified-memory build
-- (MemPalace + OpenBrain best-of) needs a HYBRID ranker — semantic recall re-scored by
-- keyword overlap and filtered by metadata (MemPalace hybrid-v4 / OB1 metadata-filter shape).
-- That ranker needs two native-Postgres index primitives the store lacks today:
--
--   1. A GIN index on `knowledge_object.metadata` (jsonb) so the agent can pre/post-filter
--      candidates by extracted facets (`@>` containment, key existence) — OB1's GIN trick.
--   2. Full-text search over the CHUNK text, because the vector candidates being re-ranked
--      are `knowledge_embedding` chunks, not whole objects. FTS lives at the same granularity
--      the ranker scores at. Implemented as a STORED generated `tsvector` column + its GIN.
--
-- This is substrate only: no ranker, no query path, no behavior change. Phase 1+ (verbatim
-- `memory_drawer`, capture loop, temporal KG, memory MCP) are tracked separately.
--
-- IMMUTABILITY. A GENERATED column expression must be IMMUTABLE. The single-arg
-- `to_tsvector(text)` is only STABLE (it reads `default_text_search_config`) and is REJECTED
-- in a generated column; the two-arg `to_tsvector('english', …)` with a literal regconfig is
-- IMMUTABLE and legal. `chunk_text` is NOT NULL; the `coalesce` is defensive only.
--
-- TABLE REWRITE. Adding a STORED generated column rewrites the table once. `knowledge_embedding`
-- is unpopulated in prod (vectorization, LP #176, is not yet live), so this is free to do now —
-- and must land BEFORE that table hydrates.
--
-- GRANTS. Existing table-level grants (0045/0047) cover the new column automatically; indexes
-- need none. No grant changes here.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until Mark runs it (each prod apply is Mark-gated). No secrets; no row data.

BEGIN;

-- ── 1. Metadata filtering: GIN over knowledge_object.metadata (OB1-style facet filter) ──
-- Default `jsonb_ops` (not `jsonb_path_ops`) so the index serves the full operator set the
-- agent may filter with: `@>` containment AND key-existence (`?`, `?|`, `?&`).
CREATE INDEX IF NOT EXISTS ix_knowledge_object_metadata_gin
  ON knowledge_object USING gin (metadata);

-- ── 2. Keyword boost: FTS tsvector over the chunk text (MemPalace hybrid keyword stage) ──
ALTER TABLE knowledge_embedding
  ADD COLUMN IF NOT EXISTS chunk_fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(chunk_text, ''))) STORED;

CREATE INDEX IF NOT EXISTS ix_knowledge_embedding_chunk_fts
  ON knowledge_embedding USING gin (chunk_fts);

COMMENT ON COLUMN knowledge_embedding.chunk_fts IS
  'Generated english tsvector over chunk_text (#1153). Hybrid-ranker keyword stage: vector '
  'candidates re-scored by ts_rank against this. STORED + IMMUTABLE (two-arg to_tsvector).';

COMMIT;
