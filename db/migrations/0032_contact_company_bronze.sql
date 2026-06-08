-- Per-source bronze landing tables for contacts and companies (ADR-0032).
--
-- The silver records are the existing `contact` and `account` tables. Each silver
-- record is assembled from MANY source systems, so every source row lands here
-- first (bronze), is normalized (silver), and summarized (gold) per CLAUDE.md §4:
--   contact sources: Imperion CRM-entered, Apollo, M365-synced, Autotask, IT Glue
--   company sources: Imperion CRM-entered, Apollo, Autotask, IT Glue
-- A future normalization/merge job (deferred — the enrichment pipeline is a later
-- priority) deterministically matches each source row to a silver `contact` /
-- `account` (email / company domain), stamping match metadata. Apollo enriches
-- BOTH contacts and companies. Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE contact_bronze_source AS ENUM
    ('imperion_crm_entered', 'apollo', 'm365_synced', 'autotask', 'itglue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE company_bronze_source AS ENUM
    ('imperion_crm_entered', 'apollo', 'autotask', 'itglue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Contact source rows (bronze → silver `contact`) ─────────────────────────
CREATE TABLE IF NOT EXISTS contact_source (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        uuid REFERENCES contact(id) ON DELETE SET NULL,  -- resolved silver (null until matched)
  source            contact_bronze_source NOT NULL,
  external_ref      text,                                            -- id in the source system
  -- Bronze → Silver → Gold (CLAUDE.md §4)
  payload_bronze    jsonb,
  normalized_silver jsonb,
  summary_gold      text,
  -- Match/merge metadata (set by the deferred normalization job)
  matched_at        timestamptz,
  match_confidence  numeric,                                         -- 0..1
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_ref)
);
COMMENT ON TABLE contact_source IS
  'Per-source bronze contact rows merged into silver contact (ADR-0032); bronze/silver/gold.';

-- ── Company source rows (bronze → silver `account`) ─────────────────────────
CREATE TABLE IF NOT EXISTS account_source (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid REFERENCES account(id) ON DELETE SET NULL,
  source            company_bronze_source NOT NULL,
  external_ref      text,
  payload_bronze    jsonb,
  normalized_silver jsonb,
  summary_gold      text,
  matched_at        timestamptz,
  match_confidence  numeric,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_ref)
);
COMMENT ON TABLE account_source IS
  'Per-source bronze company rows merged into silver account (ADR-0032); bronze/silver/gold.';

CREATE INDEX IF NOT EXISTS idx_contact_source_contact ON contact_source(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_source_source  ON contact_source(source);
CREATE INDEX IF NOT EXISTS idx_account_source_account ON account_source(account_id);
CREATE INDEX IF NOT EXISTS idx_account_source_source  ON account_source(source);

DROP TRIGGER IF EXISTS trg_contact_source_updated ON contact_source;
CREATE TRIGGER trg_contact_source_updated BEFORE UPDATE ON contact_source
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_account_source_updated ON account_source;
CREATE TRIGGER trg_account_source_updated BEFORE UPDATE ON account_source
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
