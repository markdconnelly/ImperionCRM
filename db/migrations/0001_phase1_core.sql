-- Imperion CRM — Phase 1 schema: CRM core spine + engagement timeline + identity/RBAC
-- Target: PostgreSQL 18 (Azure Database for PostgreSQL Flexible Server), db "imperioncrm".
-- Design: docs/database/data-model.md (Diagram 1) and ADR-0010/0011/0016.
-- Scope (Phase 1 only): app_user, account, contact, opportunity, interaction,
--   interaction_embedding, audit_log. Delivery (proposals/projects/readiness/handoff)
--   and the integration/demand-gen/agent/board/feedback modules land in later phases.
--
-- Idempotent and transactional: safe to re-run. Requires the `vector` extension to be
-- allowlisted on the server (azure.extensions must include VECTOR) before this runs.

BEGIN;

-- ── Extensions ──────────────────────────────────────────────────────────────
-- gen_random_uuid() is built into PostgreSQL core (>=13), no extension needed.
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Shared trigger: maintain updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Enumerated types (idempotent) ───────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE account_lifecycle_stage AS ENUM
    ('prospect','onboarding','implementation','operational_readiness','managed_active','dormant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE opportunity_sales_stage AS ENUM
    ('lead','qualified','proposal','won','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interaction_source AS ENUM
    ('m365_email','m365_teams','plaud','sms','email','facebook','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interaction_direction AS ENUM ('inbound','outbound','internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Identity & access (ADR-0016) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_user (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entra_object_id  text NOT NULL UNIQUE,
  email            text NOT NULL,
  display_name     text,
  roles            text[] NOT NULL DEFAULT '{}',   -- derived from Entra groups on sign-in
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE app_user IS 'Mirror of the Entra identity; roles derive from Entra groups (ADR-0016).';

-- ── CRM core spine (ADR-0010) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  lifecycle_stage  account_lifecycle_stage NOT NULL DEFAULT 'prospect',
  health_score     numeric,                          -- computed (Phase 2); null until scored
  owner_user_id    uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  archived_at      timestamptz
);
COMMENT ON COLUMN account.health_score IS 'Computed account health (Phase 2 signal weighting); null until scored.';

CREATE TABLE IF NOT EXISTS contact (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid REFERENCES account(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text,
  phone       text,
  attribution jsonb,                                 -- campaign/ad/utm (ADR-0012)
  pii         boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunity (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  name          text NOT NULL,
  sales_stage   opportunity_sales_stage NOT NULL DEFAULT 'lead',
  amount_mrr    numeric,
  owner_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  attribution   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz
);

-- ── Engagement timeline, bronze→silver→gold (ADR-0011) ──────────────────────
CREATE TABLE IF NOT EXISTS interaction (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid REFERENCES account(id) ON DELETE CASCADE,
  contact_id        uuid REFERENCES contact(id) ON DELETE SET NULL,
  opportunity_id    uuid REFERENCES opportunity(id) ON DELETE SET NULL,
  source            interaction_source NOT NULL,
  channel           text,
  direction         interaction_direction,
  payload_bronze    jsonb,                            -- raw source payload
  normalized_silver jsonb,                            -- cleaned/normalized
  summary_gold      text,                             -- agent-ready summary
  blob_ref          text,                             -- pointer to object storage (audio/attachments)
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE interaction IS 'Append-only lifetime-history event stream; bronze/silver/gold columns (ADR-0011).';

-- Gold: vector embeddings for agent retrieval. Dimension standardized at 1536
-- (e.g. OpenAI text-embedding-3-small); `model` recorded so the corpus can be
-- re-embedded if the embedding model changes.
CREATE TABLE IF NOT EXISTS interaction_embedding (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES interaction(id) ON DELETE CASCADE,
  embedding      vector(1536) NOT NULL,
  model          text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Audit (ADR-0016) ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  action         text NOT NULL,
  entity_type    text,
  entity_id      uuid,
  detail         jsonb,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contact_account            ON contact(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_account        ON opportunity(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_stage          ON opportunity(sales_stage);
CREATE INDEX IF NOT EXISTS idx_account_lifecycle          ON account(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_interaction_account_time   ON interaction(account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_contact        ON interaction(contact_id);
CREATE INDEX IF NOT EXISTS idx_interaction_opportunity    ON interaction(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity               ON audit_log(entity_type, entity_id);
-- Vector similarity (cosine) over gold embeddings.
CREATE INDEX IF NOT EXISTS idx_interaction_embedding_hnsw
  ON interaction_embedding USING hnsw (embedding vector_cosine_ops);

-- ── updated_at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_app_user_updated   ON app_user;
CREATE TRIGGER trg_app_user_updated   BEFORE UPDATE ON app_user   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_account_updated     ON account;
CREATE TRIGGER trg_account_updated     BEFORE UPDATE ON account     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_contact_updated     ON contact;
CREATE TRIGGER trg_contact_updated     BEFORE UPDATE ON contact     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_opportunity_updated ON opportunity;
CREATE TRIGGER trg_opportunity_updated BEFORE UPDATE ON opportunity FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
