-- Gold knowledge layer + unified vector store (ADR-0041).
--
-- The agent-consumable Gold tier (CLAUDE.md §4): one `knowledge_object` per real-world
-- entity (account, contact, device, contract, ticket, proposal, exposure, assessment,
-- security-posture item, IT Glue doc, …) holding the canonical text the orchestrator agent
-- reasons over, and one `knowledge_embedding` per chunk holding the pgvector embedding plus
-- full provenance (model, dimension, chunking_version, content_hash) so a model/chunking
-- change is a *versioned re-embed*, never an in-place overwrite.
--
-- Producer: the on-prem local pipeline owns ALL embedding/vectorization (local-pipeline §7) and
-- writes both tables. Consumer: the backend orchestrator agent queries `knowledge_embedding`
-- by cosine similarity, filtered to the pinned (embedding_model, dimension, chunking_version).
--
-- Pinned vector contract (ADR-0041): embeddings are decoupled from the generation model — the
-- agent is Claude, but Claude consumes retrieved TEXT, not vectors, so the embedding model is an
-- independent retrieval/cost/governance choice. Pinned system-wide to **Voyage AI
-- `voyage-3-large` at dimension 1024** (Anthropic's recommended embeddings provider for Claude
-- RAG). The legacy `interaction_embedding` / `contact_embedding` tables (OpenAI 1536, migrations
-- 0001/0021, unused/deferred) are a different space; converge them onto this store via a
-- versioned re-embed when embedding generation goes live. Idempotent.

BEGIN;

-- ── Gold: knowledge_object (the agent-consumable text per entity) ─────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_object (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text NOT NULL,                       -- per-tenant isolation (local-pipeline §3)
  entity_type   text NOT NULL,                       -- account|contact|device|contract|ticket|proposal|exposure|assessment|posture|itglue_doc|…
  entity_ref    text NOT NULL,                       -- stable ref to the source silver/gold row (uuid-as-text or external_ref)
  title         text,                                -- short human label
  body          text NOT NULL,                       -- canonical text that gets chunked + embedded
  summary       text,                                -- optional gold summary
  source        text,                                -- provenance (which pipeline/source produced it)
  content_hash  text NOT NULL,                       -- hash of body(+summary); unchanged → skip re-embed (no re-bill)
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- entity-specific extras (kept out of the embedded text)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entity_type, entity_ref)
);
CREATE INDEX IF NOT EXISTS ix_knowledge_object_tenant_type ON knowledge_object (tenant_id, entity_type);

-- ── Gold: knowledge_embedding (chunked vectors + full re-embed provenance) ────────────────
-- Dimension is fixed at 1024 by the pinned model. Same-dimension model/chunking changes are
-- versioned rows (old + new coexist until pruned); a DIFFERENT dimension needs a new column +
-- migration (vector(N) is fixed-width). Query path filters by (embedding_model, dimension,
-- chunking_version) so multiple versions can share the one HNSW index safely.
CREATE TABLE IF NOT EXISTS knowledge_embedding (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_object_id uuid NOT NULL REFERENCES knowledge_object(id) ON DELETE CASCADE,
  chunk_index         int  NOT NULL,
  chunk_text          text NOT NULL,
  embedding           vector(1024) NOT NULL,         -- Voyage voyage-3-large @ 1024
  embedding_model     text NOT NULL,                 -- e.g. 'voyage-3-large'
  dimension           int  NOT NULL,                 -- 1024 (stored for the versioned-query filter)
  chunking_version    text NOT NULL,                 -- e.g. 'v1' (chunk size/overlap policy)
  content_hash        text NOT NULL,                 -- hash of chunk_text (idempotency)
  token_count         int,                           -- cost telemetry
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (knowledge_object_id, chunk_index, embedding_model, chunking_version)
);
CREATE INDEX IF NOT EXISTS ix_knowledge_embedding_object  ON knowledge_embedding (knowledge_object_id);
CREATE INDEX IF NOT EXISTS ix_knowledge_embedding_version ON knowledge_embedding (embedding_model, chunking_version);
-- HNSW cosine index for semantic search (same pattern as interaction_embedding, 0001).
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding_hnsw
  ON knowledge_embedding USING hnsw (embedding vector_cosine_ops);

-- ── Grants for the local-pipeline SP (the producer; ADR-0003 / migration 0044) ───────────
-- SELECT/INSERT/UPDATE on both; DELETE on knowledge_embedding ONLY — the vectorization
-- lifecycle prunes superseded vector versions after the new version is verified (local-pipeline
-- §7 retention). This is the one scoped DELETE the pipeline role holds; everywhere else it has
-- none (0044). The web app identity inherits SELECT via 0002's ALTER DEFAULT PRIVILEGES.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE         ON TABLE knowledge_object    TO "imperion-localpipeline";
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE knowledge_embedding TO "imperion-localpipeline";
  END IF;
  -- The backend agent (web app managed identity, 0002) reads gold — grant SELECT explicitly
  -- (defensive: doesn't rely on ALTER DEFAULT PRIVILEGES matching the migration-running role).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON TABLE knowledge_object, knowledge_embedding TO "mgid-imperioncrm-web-prd";
  END IF;
END $$;

COMMIT;
