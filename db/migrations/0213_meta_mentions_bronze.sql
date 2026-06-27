-- 0213: Meta brand-mention bronze table (`meta_mentions`).
--
-- Migration number 0213 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- PLACEHOLDER. The rebased branch takes the next free number just before squash; if another
-- migration merges during the CI window, renumber this file + every reference.
--
-- WHY THIS EXISTS. The unified Social plane (front-end ADR-0124; epic #1338) splits inbound
-- public social into two halves (ADR-0124 #2): comments on OUR posts and brand MENTIONS of us
-- both land in silver `social_engagement` (NOT the Interaction timeline). LocalPipeline slice H
-- (LP #357) hydrated `social_engagement` from FB/IG **comments** only — brand **mentions** were
-- deferred because no Meta mention bronze table existed (issue #1365 §3). This migration adds
-- that missing bronze table (the `threads_mentions`/0208 precedent), unblocking the LP mention
-- COLLECTOR slice. The `social_engagement_kind` enum already carries `mention` (0210) and the LP
-- `Invoke-ImperionSocialEngagementMerge` is already mention-ready, so this is the last schema gap.
--
-- POLL-FIRST (ADR-0124 #8): mentions are polled via the Meta Graph API (Page mention edge / IG
-- tagged-media edge), no webhook dependency for v1.
--
-- SHAPE. Unlike the older Meta bronze (0075, tenant/source/external_id envelope), this table uses
-- the explicit poll-merge bronze shape the LP mention collector writes against (issue #1365
-- authoritative DDL): a synthetic `id` PK, the natural key `UNIQUE (platform, mention_id)` for
-- idempotent re-polling (UPSERT), flat author/content columns, lossless `raw jsonb`, and
-- `ingested_at`. `platform` is facebook|instagram; `mention_kind` is tagged_post|tagged_media|
-- comment_mention. tenant scope is Imperion's OWN public presence (first-party assets, not client
-- data) — the rows carry THIRD-PARTY author personal data (the people mentioning us), governed by
-- the lawful-basis note on the silver `social_engagement` concept file (ADR-0025).
--
-- Frontend-owned schema (ADR-0042). Additive + idempotent + transactional. No PII inlined, no
-- secrets — the Meta token lives in Key Vault (`conn-company-meta`), referenced by name only
-- (ADR-0103/0122). DORMANT — 0 rows until the LP mention collector runs. NOT prod-applied until
-- Mark runs it.

BEGIN;

-- ── Bronze: Meta brand mentions (public mentions OF us, FB Page + IG) ─────────
-- One flat row per mention. mention_id is the platform object id (the tagged post/media or the
-- comment id that mentions us). Merges to silver social_engagement (kind=mention) on-prem
-- (merge co-locates with ingestion, LP ADR-0026).
CREATE TABLE IF NOT EXISTS meta_mentions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         text NOT NULL,            -- facebook|instagram
  mention_id       text NOT NULL,            -- platform object id (tagged post/media or comment id)
  mention_kind     text,                     -- tagged_post|tagged_media|comment_mention
  permalink        text,
  message          text,
  author_id        text,
  author_username  text,
  author_name      text,
  created_time     timestamptz,
  raw              jsonb,
  ingested_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, mention_id)
);
COMMENT ON TABLE meta_mentions IS
  'Bronze: public Meta (FB Page + IG) brand mentions of us via the conn-company-meta token (local pipeline, #1365). Merges to silver social_engagement (kind=mention); idempotent on (platform, mention_id). ADR-0124 #2/#8.';
CREATE INDEX IF NOT EXISTS idx_meta_mentions_platform_created
  ON meta_mentions(platform, created_time DESC);

-- ── Grants ───────────────────────────────────────────────────────────────────
-- The local pipeline both collects (bronze) and merges (silver, social_engagement) here — the
-- Meta 0075 / Threads 0208 posture-merge precedent (LP ADR-0026). The social_engagement write
-- surface is already granted to the role (#1364), so re-grant only the new bronze table here.
-- Never DELETE (0044 posture). The web role reads the new bronze for the Data-sources drill-down
-- (re-grant explicitly for safety, the 0075 pattern). Defensive — roles may be absent in a given
-- environment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON meta_mentions TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON meta_mentions TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
