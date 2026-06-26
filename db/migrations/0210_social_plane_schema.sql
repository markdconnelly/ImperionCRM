-- 0210: Social Media Management plane — slice A schema (#1339, epic #1338, ADR-0124).
--
-- Migration number 0210 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHAT THIS IS. The silver schema for the unified Social plane (ADR-0124). Most ADR-0124
-- entities ALREADY exist — slice A is deliberately small: 2 new content tables + 1 new
-- inbound store + EXTEND the existing `ad` + REUSE the metric tables + governance-by-reference.
--
--   ad (EXTEND, mig 0023)       — +4 cols: adset_external_ref, daily_budget, audience_id,
--                                 boosted_from_social_post_id (the Boost bridge). ad-id stays
--                                 in external_ref; act_<adAccountId> is a credential-blob value
--                                 (conn-company-meta, BE #426), NOT a row column.
--   social_post (NEW)           — compose-once parent (single composition; ADR-0124 #3). One
--                                 authored piece, lifecycle draft→scheduled→published→archived,
--                                 optional link to a marketing campaign.
--   social_post_channel (NEW)   — per-network fan-out child (the result on one Social Channel).
--                                 UNIQUE (social_post_id, channel) — one row per network.
--   social_engagement (NEW)     — the ADR-0124 #2 inbound-split store: public comments on our
--                                 posts + brand mentions. NOT on the Interaction timeline (keeps
--                                 Contact-360 clean); contact-linked only on match (slice G).
--                                 UNIQUE (channel, external_id) — idempotent poll-in merge.
--
-- METRICS — reuse, NO new table: organic → social_metric (0075), paid → campaign_metric (0023).
-- SOCIAL ACTION — NO schema: existing agent_pending_action (0158) + the 11 social action_kinds
--   (#418, seeded/ceiled 0209, paid-wired #426). Linkage is documented in OKF, not a back-FK.
--
-- ARCHETYPE. social_post / social_post_channel = B (single-source-of-record silver, born here —
-- the campaign/ad neighbor). social_engagement = B (single-SoR app store, poll-merged from the
-- platform — the contact_social_identity neighbor). data_class = operational for all (matches
-- social_metric/campaign/campaign_metric); third-party author PII on social_engagement is
-- handled by an OKF lawful-basis note (ADR-0025), NOT by over-classing the table's read-gate.
--
-- GRANTS (ADR-0042 §1: web reads for render, every PROCESS writes via backend; LP/pipeline owns
-- ingestion merges, ADR-0026). Defensive DO $$ … pg_roles … $$ idiom (roles may be absent on
-- CI / fresh DBs) per 0158/0123. Frontend-owned schema (ADR-0042). No PII, no secrets. Additive,
-- idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / enum guards), transactional. NOT
-- prod-applied until merge (each prod apply is Mark-gated, §10.3).

BEGIN;

-- ── Enums ─────────────────────────────────────────────────────────────────────
-- One Social Channel = the company's presence on one network (ADR-0124 #1). NO channel-registry
-- table — "connected" is derived from connection rows (conn-company-meta/-threads/-linkedin).
DO $$ BEGIN
  CREATE TYPE social_channel AS ENUM ('facebook','instagram','threads','linkedin','messenger');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- social_post lifecycle INTENT (the composition's overall state).
DO $$ BEGIN
  CREATE TYPE social_post_status AS ENUM ('draft','scheduled','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- per-channel publish RESULT (one network's outcome; adds 'failed' over the intent enum).
DO $$ BEGIN
  CREATE TYPE social_publish_status AS ENUM ('draft','scheduled','published','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- the kind of inbound public engagement (ADR-0124 #2 — comments on our posts + brand mentions).
DO $$ BEGIN
  CREATE TYPE social_engagement_kind AS ENUM ('comment','mention');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- inbound triage lifecycle.
DO $$ BEGIN
  CREATE TYPE social_engagement_status AS ENUM ('new','triaged','replied','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Social Post — compose-once parent (ADR-0124 #3) ───────────────────────────
CREATE TABLE IF NOT EXISTS social_post (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content            jsonb,                                         -- the authored composition (copy + asset refs)
  campaign_id        uuid REFERENCES campaign(id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  status             social_post_status NOT NULL DEFAULT 'draft',  -- draft→scheduled→published→archived (intent)
  scheduled_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE social_post IS
  'Silver: compose-once organic social composition (ADR-0124 #3). Authored once, fanned out to one or more Social Channels via social_post_channel. Born silver (website SoR); optional link to a marketing campaign. NOT a campaign_send (public broadcast, no recipient/consent model).';

CREATE INDEX IF NOT EXISTS idx_social_post_campaign  ON social_post(campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_post_status    ON social_post(status, scheduled_at);

-- ── Social Post Channel — per-network fan-out result ──────────────────────────
CREATE TABLE IF NOT EXISTS social_post_channel (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_post_id  uuid NOT NULL REFERENCES social_post(id) ON DELETE CASCADE,
  channel         social_channel NOT NULL,
  adapted_payload jsonb,                                            -- the composition adapted to this network's constraints
  publish_status  social_publish_status NOT NULL DEFAULT 'draft',
  external_id     text,                                             -- platform post id once live
  published_at    timestamptz,
  error           text,                                             -- last publish failure (publish_status='failed')
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (social_post_id, channel)                                  -- one fan-out row per network
);
COMMENT ON TABLE social_post_channel IS
  'Silver: per-network result of a social_post fan-out (ADR-0124 #3). One row per (social_post, channel); carries the network-adapted payload, publish status, the platform post id, and last error. UNIQUE (social_post_id, channel).';

CREATE INDEX IF NOT EXISTS idx_social_post_channel_post ON social_post_channel(social_post_id);

-- ── Social Engagement — inbound public store (ADR-0124 #2 inbound split) ───────
-- Public comments on our posts + brand mentions. Deliberately NOT on the Interaction timeline
-- (that is contact-centric and feeds Contact-360; public chatter is often anonymous). Linked to
-- a contact only on match (slice G writes contact_id). v1 scope: organic-post comments + mentions.
CREATE TABLE IF NOT EXISTS social_engagement (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel                  social_channel NOT NULL,
  external_id              text NOT NULL,                           -- platform's stable id for the comment/mention
  kind                     social_engagement_kind NOT NULL,
  body                     text,
  posted_at                timestamptz,
  ingested_at              timestamptz NOT NULL DEFAULT now(),
  -- author captured inline (third-party PII; lawful-basis note in OKF, ADR-0025). NOT a contact yet.
  author_external_id       text,
  author_handle            text,
  author_display_name      text,
  author_profile_url       text,
  contact_id               uuid REFERENCES contact(id) ON DELETE SET NULL,             -- set on match (slice G)
  on_social_post_channel_id uuid REFERENCES social_post_channel(id) ON DELETE SET NULL, -- set for comments on OUR posts
  source_url               text,                                    -- the mention's source (mentions)
  status                   social_engagement_status NOT NULL DEFAULT 'new',
  intent                   text,                                    -- triage intent (lead/support/brand → routing)
  assigned_agent_key       text,                                    -- routed agent (Chase/Felix/Belle)
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)                                     -- idempotent poll-in merge
);
COMMENT ON TABLE social_engagement IS
  'Silver: inbound public social engagements — comments on our posts + brand mentions (ADR-0124 #2 inbound split). Deliberately NOT on the Interaction timeline (keeps Contact-360 clean); contact-linked only on match (slice G). UNIQUE (channel, external_id) for idempotent poll-in merge (ADR-0026). Third-party author PII handled via the OKF lawful-basis note (ADR-0025), not by over-classing the read-gate.';

CREATE INDEX IF NOT EXISTS idx_social_engagement_status  ON social_engagement(status, ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_engagement_post    ON social_engagement(on_social_post_channel_id);
CREATE INDEX IF NOT EXISTS idx_social_engagement_contact ON social_engagement(contact_id);

-- ── Extend `ad` (mig 0023) — Boost bridge + ad-level paid fields (ADR-0124 #6) ─
-- The Meta act_/campaign/adset/ad hierarchy: campaign-level budget already lives on campaign;
-- these add the ad-level adset ref + daily budget, the ad audience, and the Boost source post.
ALTER TABLE ad ADD COLUMN IF NOT EXISTS adset_external_ref          text;
ALTER TABLE ad ADD COLUMN IF NOT EXISTS daily_budget               numeric;
ALTER TABLE ad ADD COLUMN IF NOT EXISTS audience_id                uuid REFERENCES audience(id) ON DELETE SET NULL;
ALTER TABLE ad ADD COLUMN IF NOT EXISTS boosted_from_social_post_id uuid REFERENCES social_post(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ad_audience       ON ad(audience_id);
CREATE INDEX IF NOT EXISTS idx_ad_boosted_from   ON ad(boosted_from_social_post_id);

-- ── updated_at triggers ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_social_post_updated ON social_post;
CREATE TRIGGER trg_social_post_updated BEFORE UPDATE ON social_post
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_social_post_channel_updated ON social_post_channel;
CREATE TRIGGER trg_social_post_channel_updated BEFORE UPDATE ON social_post_channel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_social_engagement_updated ON social_engagement;
CREATE TRIGGER trg_social_engagement_updated BEFORE UPDATE ON social_engagement
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants (ADR-0042 §1; defensive — roles may be absent, per 0158/0123) ──────
-- web (mgid-imperioncrm-web-prd):   SELECT social_post/_channel/_engagement (render).
-- backend (…backendfunction):       RW social_post/_channel (publish process), UPDATE
--                                    social_engagement (triage), + INSERT on ad (Boost mints an ad,
--                                    beyond 0205's SELECT,UPDATE).
-- pipeline (mgid-imperioncrmpipeline): SELECT social_post/_channel (render context); RW
--                                    social_engagement (poll-in merge, ADR-0026; LP merges run as
--                                    the pipeline identity).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON social_post, social_post_channel, social_engagement
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON social_post, social_post_channel
      TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, UPDATE         ON social_engagement
      TO "mgid-imperioncrmbackendfunction";
    GRANT INSERT                 ON ad                       -- Boost mints an ad (beyond 0205 SELECT,UPDATE)
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT                 ON social_post, social_post_channel
      TO "mgid-imperioncrmpipeline";
    GRANT SELECT, INSERT, UPDATE ON social_engagement       -- poll-in merge (ADR-0026); LP runs as pipeline
      TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grants.';
  END IF;
END $$;

COMMIT;
