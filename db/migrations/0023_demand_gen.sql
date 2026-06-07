-- Demand generation (ADR-0012/0026). Campaigns → ads → polled metrics, plus
-- audiences built over the aggregated enriched profiles. Ads launch against an
-- audience; using a member for ad targeting is gated on ad_targeting consent
-- (ADR-0026/0014). Polled metrics are never the system of record. Idempotent and
-- transactional. Requires campaign before the contact/opportunity FKs.

BEGIN;

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE campaign_platform AS ENUM ('facebook','google','youtube','linkedin','email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft','active','paused','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audience_kind AS ENUM ('static','dynamic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Campaigns / ads / metrics ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  platform           campaign_platform NOT NULL,
  objective          text,
  status             campaign_status NOT NULL DEFAULT 'draft',
  budget             numeric,
  start_at           date,
  end_at             date,
  external_ref       text,
  created_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ad (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
  name         text NOT NULL,
  creative     jsonb,
  status       campaign_status NOT NULL DEFAULT 'draft',
  external_ref text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_metric (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaign(id) ON DELETE CASCADE,
  ad_id       uuid REFERENCES ad(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  spend       numeric,
  impressions integer,
  clicks      integer,
  leads       integer,
  raw         jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE campaign_metric IS 'Polled ad-platform metrics (never the system of record; ADR-0012).';

-- ── Audiences over aggregated profiles ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS audience (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  description        text,
  kind               audience_kind NOT NULL DEFAULT 'static',
  definition         jsonb,                             -- criteria over contact_enrichment (dynamic)
  platform_sync_ref  text,
  created_by_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE audience IS 'Aggregated-profile audience; ad targeting of a member is gated on ad_targeting consent (ADR-0026).';

CREATE TABLE IF NOT EXISTS audience_member (
  audience_id uuid NOT NULL REFERENCES audience(id) ON DELETE CASCADE,
  contact_id  uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  source      text,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (audience_id, contact_id)
);

-- ── Campaign attribution (alongside the existing attribution jsonb) ─────────
ALTER TABLE contact
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES campaign(id) ON DELETE SET NULL;
ALTER TABLE opportunity
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES campaign(id) ON DELETE SET NULL;

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ad_campaign            ON ad(campaign_id);
CREATE INDEX IF NOT EXISTS idx_metric_campaign_date   ON campaign_metric(campaign_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_audience_member_contact ON audience_member(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_campaign       ON contact(campaign_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_campaign   ON opportunity(campaign_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_campaign_updated ON campaign;
CREATE TRIGGER trg_campaign_updated BEFORE UPDATE ON campaign
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_ad_updated ON ad;
CREATE TRIGGER trg_ad_updated BEFORE UPDATE ON ad
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_audience_updated ON audience;
CREATE TRIGGER trg_audience_updated BEFORE UPDATE ON audience
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
