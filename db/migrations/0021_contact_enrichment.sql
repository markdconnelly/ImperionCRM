-- Contact-360 enrichment / dossier (ADR-0025). Builds a rich, agent-consumable
-- profile of a person *before* a salesperson talks to them: a profile header on
-- `contact`, linked social identities, and a per-fact dossier where every fact
-- carries provenance and a lawful basis (extends the consent ledger, ADR-0014).
-- Gold-layer (CLAUDE.md §4). Idempotent and transactional.
-- Requires lawful_basis (0019) and connection (0020).

BEGIN;

-- ── Profile header on contact ───────────────────────────────────────────────
ALTER TABLE contact
  ADD COLUMN IF NOT EXISTS title            text,
  ADD COLUMN IF NOT EXISTS headline         text,
  ADD COLUMN IF NOT EXISTS location         text,
  ADD COLUMN IF NOT EXISTS avatar_url       text,
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'stranger',  -- stranger|known|engaged|customer
  ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz;

-- ── Social identities (one contact → many platforms) ────────────────────────
CREATE TABLE IF NOT EXISTS contact_social_identity (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  platform       text NOT NULL,                         -- linkedin|youtube|facebook|x|instagram|…
  handle         text,
  profile_url    text,
  external_id    text,
  follower_count integer,
  verified       boolean NOT NULL DEFAULT false,
  raw            jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Enrichment dossier (EAV, mirrors engagement_answer) ─────────────────────
-- One row per discovered fact, each with confidence, provenance, and lawful basis.
CREATE TABLE IF NOT EXISTS contact_enrichment (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id           uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  attribute_key        text NOT NULL,                   -- employer|role|interest|tech_stack|…
  value_text           text,
  value_json           jsonb,
  confidence           numeric,                         -- 0..1
  source               text,                            -- linkedin|youtube|web|m365|manual|agent
  source_connection_id uuid REFERENCES connection(id) ON DELETE SET NULL,
  lawful_basis         lawful_basis NOT NULL DEFAULT 'legitimate_interest',
  observed_at          timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE contact_enrichment IS
  'Per-fact contact dossier with provenance + lawful basis; enrichment/ad use gated by consent (ADR-0014/0025).';

-- ── Semantic profile embedding (gold; audience similarity) ──────────────────
CREATE TABLE IF NOT EXISTS contact_embedding (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  embedding  vector(1536) NOT NULL,
  model      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_social_identity_contact ON contact_social_identity(contact_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_contact      ON contact_enrichment(contact_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_key          ON contact_enrichment(attribute_key);
CREATE INDEX IF NOT EXISTS idx_contact_embedding_hnsw
  ON contact_embedding USING hnsw (embedding vector_cosine_ops);

-- ── updated_at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_social_identity_updated ON contact_social_identity;
CREATE TRIGGER trg_social_identity_updated BEFORE UPDATE ON contact_social_identity
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_enrichment_updated ON contact_enrichment;
CREATE TRIGGER trg_enrichment_updated BEFORE UPDATE ON contact_enrichment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
