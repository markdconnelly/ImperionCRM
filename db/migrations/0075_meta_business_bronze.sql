-- Meta Business Manager — organic social ingestion schema (#253).
--
-- Imperion's Business Suite assets (FB Page + Instagram business account) are read
-- with a Business Manager SYSTEM-USER token (non-expiring, on-prem SecretStore
-- custody) by the on-prem local pipeline (bulk-ingestion contract, ADR-0042). The
-- local repo also merges (posture-merge precedent): posts/comments → interaction
-- (social_post/social_comment), page-inbox DMs → interaction (dm) AND
-- lead_capture_event (new lead_hook_kind 'facebook_dm' — DM senders are leads,
-- commenters are timeline-only), insights → social_metric (organic home;
-- campaign_metric stays paid-only per ADR-0012).
--
-- Bronze follows the local-pipeline envelope (0038): lossless raw_payload, flat
-- text columns the loader coerces to stable strings, PK (tenant_id, source,
-- external_id), content_hash change detection. tenant_id is Imperion's own tenant
-- (first-party assets, not client data).
--
-- Enum note: ALTER TYPE … ADD VALUE inside a transaction is fine on PG ≥ 12, but
-- the values are not USED until commit — no seeds here. Idempotent, additive,
-- transactional. No secrets.

BEGIN;

-- ── Enums ────────────────────────────────────────────────────────────────────
ALTER TYPE interaction_source ADD VALUE IF NOT EXISTS 'instagram';
ALTER TYPE lead_hook_kind     ADD VALUE IF NOT EXISTS 'facebook_dm';

-- ── Bronze: Facebook Page ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facebook_posts (
  page_id text, message text, story text, status_type text, permalink_url text,
  from_id text, from_name text, created_time text, updated_time text,
  is_published text, comment_count text, reaction_count text, share_count text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE facebook_posts IS
  'Bronze: FB Page feed posts via BM system-user token (local pipeline, #253).';

CREATE TABLE IF NOT EXISTS facebook_comments (
  post_external_id text, parent_comment_id text, message text,
  from_id text, from_name text, created_time text, like_count text, comment_count text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE facebook_comments IS
  'Bronze: comments on FB Page posts (timeline-only in silver — commenters are not leads).';

CREATE TABLE IF NOT EXISTS facebook_messages (
  conversation_id text, page_id text, message text,
  from_id text, from_name text, to_id text, to_name text, created_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE facebook_messages IS
  'Bronze: page-inbox (Messenger) messages. DM senders become lead captures (facebook_dm).';

-- ── Bronze: Instagram business account ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS instagram_media (
  ig_user_id text, ig_username text, caption text, media_type text,
  media_product_type text, permalink text, media_url text, created_time text,
  like_count text, comments_count text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE instagram_media IS
  'Bronze: IG business-account media via the linked FB Page (local pipeline, #253).';

CREATE TABLE IF NOT EXISTS instagram_comments (
  media_external_id text, parent_comment_id text, comment_text text,
  username text, from_id text, created_time text, like_count text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE instagram_comments IS
  'Bronze: comments on IG media (timeline-only in silver).';

-- ── Bronze: organic insights snapshots (Page + IG) ───────────────────────────
-- external_id = "<entity_kind>:<entity_id>:<metric>:<period>:<end_time>" (loader-built).
CREATE TABLE IF NOT EXISTS meta_insights (
  entity_kind text, entity_external_id text, metric text, period text,
  end_time text, value text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE meta_insights IS
  'Bronze: raw Page/IG insight snapshots (followers, reach, engagement, …).';

-- ── Silver: organic social metrics ───────────────────────────────────────────
-- Organic counterpart to campaign_metric (which remains paid-campaign-scoped,
-- ADR-0012). One row per (platform, entity, metric, period, captured point).
CREATE TABLE IF NOT EXISTS social_metric (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform           text NOT NULL,            -- facebook|instagram
  entity_kind        text NOT NULL,            -- page|ig_user|post|media
  entity_external_id text NOT NULL,
  metric             text NOT NULL,            -- follower_count|reach|impressions|…
  period             text,                     -- day|week|days_28|lifetime
  value              numeric,
  captured_at        timestamptz NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, entity_kind, entity_external_id, metric, period, captured_at)
);
COMMENT ON TABLE social_metric IS
  'Silver: organic social insight time series (Meta Page + IG), merged from meta_insights (#253).';
CREATE INDEX IF NOT EXISTS idx_social_metric_entity
  ON social_metric(platform, entity_external_id, metric, captured_at DESC);

-- ── Grants ───────────────────────────────────────────────────────────────────
-- The local pipeline both collects (bronze) and merges (silver) here — posture-merge
-- precedent. Widened silver write surface for the merge: interaction (idempotent
-- NOT-EXISTS insert on (source, external_ref)), lead capture (DM senders → leads),
-- contact create/update, social-identity linking. Never DELETE (0044 posture).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON
      facebook_posts, facebook_comments, facebook_messages,
      instagram_media, instagram_comments, meta_insights, social_metric
      TO "imperion-localpipeline";
    GRANT SELECT, INSERT         ON interaction        TO "imperion-localpipeline";
    GRANT SELECT, INSERT         ON lead_hook          TO "imperion-localpipeline";
    GRANT SELECT, INSERT, UPDATE ON lead_capture_event TO "imperion-localpipeline";
    GRANT SELECT, INSERT, UPDATE ON contact            TO "imperion-localpipeline";
    GRANT SELECT, INSERT, UPDATE ON contact_social_identity TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;

  -- Web role reads social_metric for future reporting surfaces; bronze readable for
  -- the Data-sources drill-down (0002 default privileges cover new tables for the web
  -- role only if created by the migration admin — re-grant explicitly for safety).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON
      facebook_posts, facebook_comments, facebook_messages,
      instagram_media, instagram_comments, meta_insights, social_metric
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
