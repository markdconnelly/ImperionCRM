-- 0208: Threads bronze tables + `interaction`/`social_metric` silver mapping enablement
-- (Threads epic #1334, slice S2 #1336; ADR-0125-threads-integration D1/D2, PR #1345).
--
-- Migration number 0208 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- PLACEHOLDER (0208_threads_bronze.sql). The rebased branch takes the next free number just
-- before squash; if another migration merges during the CI window, renumber this file + every
-- reference. The ADR it cites (ADR-0125-threads-integration, PR #1345) is likewise a placeholder.
--
-- WHY THIS EXISTS. Imperion OS runs OUR OWN Threads business presence (post · reply · monitor
-- mentions · insights) — Belle drafts, humans approve outbound (epic #1334, plane ADR-0124).
-- Threads is a SEPARATE API (`graph.threads.net`) with its OWN Threads OAuth — it shares no
-- token or code with the FB/IG Graph Meta integration (0075, `conn-company-meta`). So it is a
-- net-new connector (`conn-company-threads`, company-scope) + a net-new bronze set, but its data
-- rides the EXISTING unified timeline and its insights ride the EXISTING social-metric layer —
-- no silo (ADR-0125 D2, the Meta 0075 precedent). This slice (S2) owns the SCHEMA: the bronze
-- tables, the two enum values the connector + timeline need, and the documented silver mapping.
--
-- WHAT IT ADDS.
--   1. `connection_provider += 'threads'` (ADR-0125 D1) — makes the S1 connector row writable.
--      S1 (#1335 / PR #1345) shipped the GUI card with a TS-string `key`; this value ends that
--      dormancy on the credential-write path (the 0127 Meta precedent: provider-list GUI first,
--      enum value in the paired schema migration). No row uses it here.
--   2. `interaction_source += 'threads'` — Threads posts/replies/mentions are `interaction`
--      rows with `source='threads'` (ADR-0125 D2; the unified timeline already spans channels,
--      ADR-0011 / 0018 / 0075). `kind` is free-text (0018) so `social_post` / `social_comment`
--      (replies) / `mention` need NO enum change.
--   3. Four bronze tables (standard ADR-0042/0038 envelope, source `threads`):
--      `threads_posts`, `threads_replies`, `threads_mentions`, `threads_insights`. The six App
--      Review scopes (ADR-0125 D4) map: `threads_basic`+`threads_content_publish` → posts;
--      `threads_manage_replies`+`threads_read_replies` → replies; `threads_manage_mentions` →
--      mentions; `threads_manage_insights` → insights.
--
-- WHO WRITES IT. LocalPipeline owns the Threads bronze→silver merge (merge-co-locates-with-
-- ingestion, LP ADR-0026 — scheduled bulk on-prem; the Meta/posture precedent), S3 LP #356:
--   * posts/replies/mentions → `interaction` (source=threads, kind social_post/social_comment/
--     mention, direction by author: ours=outbound, theirs=inbound; idempotent on (source,
--     external_ref)).
--   * insights → `social_metric` (platform='threads'; ADR-0124 D9 → BI hub, #135 name norm).
-- No new silver table — both `interaction` and `social_metric` already exist (0018/0075); this
-- migration only enables the `threads` mapping (a new bronze feed + the source enum value), so
-- the OKF update is a timestamp/feed-row bump on the two existing concept files (§11, in-PR).
--
-- Enum note: PostgreSQL ≥12 (target 18) allows `ALTER TYPE … ADD VALUE` inside a transaction;
-- a value added here may NOT be USED until the txn commits — there is no seed row here that uses
-- either new value, so a single transaction is correct (the 0075 Meta precedent did exactly this:
-- enum adds + bronze tables in one BEGIN/COMMIT). `collected_at text NOT NULL` matches the LP
-- bronze envelope (0038/0075) — the loader coerces source timestamps to stable strings.
--
-- Frontend-owned schema (ADR-0042). Additive + idempotent + transactional. No PII inlined; the
-- measured entities are our own PUBLIC Threads presence (bronze carries our own posts/replies +
-- public mentions of us). No secrets — the Threads token lives in Key Vault as `conn-company-
-- threads`, referenced by name only (ADR-0103/0122). DORMANT — 0 rows until the token lands,
-- App Review clears, and the S3 LP collectors run. NOT prod-applied until Mark runs it.

BEGIN;

-- ── Enums ────────────────────────────────────────────────────────────────────
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'threads';
ALTER TYPE interaction_source  ADD VALUE IF NOT EXISTS 'threads';

-- ── Bronze: Threads posts (our own published posts) ──────────────────────────
-- threads_basic + threads_content_publish. external_id = Threads media/post id.
CREATE TABLE IF NOT EXISTS threads_posts (
  threads_user_id text, username text, text_content text, media_type text,
  permalink text, shortcode text, is_quote_post text,
  reply_audience text, created_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE threads_posts IS
  'Bronze: our own Threads posts via the conn-company-threads token (local pipeline, S3 #356). Merges to interaction (source=threads, kind=social_post, direction=outbound).';

-- ── Bronze: Threads replies (replies on/under our posts) ─────────────────────
-- threads_manage_replies + threads_read_replies. root_post_external_id threads the conversation.
CREATE TABLE IF NOT EXISTS threads_replies (
  root_post_external_id text, replied_to_external_id text,
  threads_user_id text, username text, text_content text,
  media_type text, permalink text, hide_status text, created_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE threads_replies IS
  'Bronze: replies on our Threads posts (local pipeline, S3 #356). Merges to interaction (source=threads, kind=social_comment, direction by author).';

-- ── Bronze: Threads mentions (public mentions OF us) ─────────────────────────
-- threads_manage_mentions. v1 mentions are *of us* → ride the contact-centric timeline (ADR-0124
-- inbound split D2); anonymous public brand chatter would route to the Social Engagement store.
CREATE TABLE IF NOT EXISTS threads_mentions (
  mentioned_post_external_id text, threads_user_id text, username text,
  text_content text, permalink text, created_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE threads_mentions IS
  'Bronze: public Threads mentions of us (local pipeline, S3 #356). Merges to interaction (source=threads, kind=mention, direction=inbound).';

-- ── Bronze: Threads insights (organic metric snapshots) ──────────────────────
-- threads_manage_insights. external_id = "<entity_kind>:<entity_id>:<metric>:<period>:<end_time>"
-- (loader-built), mirroring meta_insights (0075).
CREATE TABLE IF NOT EXISTS threads_insights (
  entity_kind text, entity_external_id text, metric text, period text,
  end_time text, value text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE threads_insights IS
  'Bronze: Threads organic insight snapshots (views, likes, replies, reposts, quotes, followers; local pipeline, S3 #356). Merges to social_metric (platform=threads).';

-- ── Grants ───────────────────────────────────────────────────────────────────
-- The local pipeline both collects (bronze) and merges (silver) here — the Meta 0075 posture-
-- merge precedent (LP ADR-0026). Silver write surface mirrors 0075's organic-social merge:
-- interaction (idempotent NOT-EXISTS insert on (source, external_ref)) + social_metric. Threads
-- mentions are *of us*, not lead captures, so NO lead_hook/lead_capture grant (the FB-DM-only
-- distinction). Never DELETE (0044 posture). The web role reads bronze + social_metric for the
-- BI / Data-sources surfaces. Defensive — roles may be absent in a given environment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON
      threads_posts, threads_replies, threads_mentions, threads_insights
      TO "imperion-localpipeline";
    GRANT SELECT, INSERT         ON interaction   TO "imperion-localpipeline";
    GRANT SELECT, INSERT, UPDATE ON social_metric TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON
      threads_posts, threads_replies, threads_mentions, threads_insights
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
