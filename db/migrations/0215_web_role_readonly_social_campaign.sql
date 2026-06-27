-- 0215: web role READ-ONLY on the social/campaign silver tables (issue #1360, ADR-0042 §1).
--
-- Migration number 0215 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY. ADR-0042 §1: the web (GUI) role does direct DB *reads* for rendering; every *write*
-- is a process and goes through the backend/pipeline boundary. The social-plane + demand-gen
-- tables below are written by the backend (compose/save/send), the cloud pipeline (metrics
-- ingest), and the local pipeline (engagement/DM merge) under their OWN roles. The web role
-- has no business writing them.
--
-- The over-grant is structural, not local: migration 0002 grants the web identity
-- "mgid-imperioncrm-web-prd" blanket SELECT, INSERT, UPDATE, DELETE on ALL TABLES (plus an
-- ALTER DEFAULT PRIVILEGES that re-applies the same to every future table). So even where a
-- later migration tried to constrain the web role to SELECT (e.g. 0210:172 for social_post /
-- social_post_channel / social_engagement), the 0002 default silently won. This migration
-- pins the documented SELECT-only intent for the nine tables flagged in #1360 by REVOKING the
-- write privileges the blanket grant handed out, and re-asserting SELECT.
--
-- SCOPE. Exactly the nine tables in #1360 — the social plane (social_post, social_post_channel,
-- social_engagement, social_metric), demand-gen (campaign, ad, campaign_metric), the campaign
-- send ledger (campaign_send), and the Contact-360 timeline (interaction). The systemic 0002
-- blanket-grant pattern (every other backend/pipeline-written table inherits the same
-- over-grant) is a broader audit tracked separately — see #1360's follow-up.
--
-- Idempotent (REVOKE of an absent privilege is a no-op; GRANT SELECT is repeatable); skips if
-- the role is absent (defensive DO $$ … pg_roles … $$ idiom, per 0064/0210 — roles may be
-- absent on CI / fresh DBs). Additive, transactional. NOT prod-applied until merge (each prod
-- apply is Mark-gated, §10.3).

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    -- Strip the writes the 0002 blanket grant handed out.
    REVOKE INSERT, UPDATE, DELETE
      ON social_post, social_post_channel, social_engagement, social_metric,
         campaign, ad, campaign_metric, campaign_send, interaction
      FROM "mgid-imperioncrm-web-prd";

    -- Re-assert the intended read access (the GUI renders these; idempotent).
    GRANT SELECT
      ON social_post, social_post_channel, social_engagement, social_metric,
         campaign, ad, campaign_metric, campaign_send, interaction
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read-only revoke.';
  END IF;
END $$;

COMMIT;
