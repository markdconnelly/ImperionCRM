-- 0206: Instagram Direct Messages bronze table + the `instagram_dm` lead-hook kind.
--
-- The READ half of the IG messaging use case (front-end ADR-0124 Social Media plane;
-- epic #1338; LocalPipeline #361). The OUTBOUND IG reply adapters ship separately
-- (ImperionCRM_Backend #419). Imperion's own IG business account DMs are read with a
-- PAGE access token (the linked-Page hop, New Pages Experience) by the on-prem local
-- pipeline and merged on-prem (merge co-locates with ingestion, local-pipeline ADR-0026):
-- IG DMs → interaction (source instagram, kind dm; direction by sender) AND, for inbound
-- DM senders, lead_capture_event under a new lead_hook kind 'instagram_dm' — the IG twin
-- of 'facebook_dm' from migration 0075 (DM senders are leads; commenters stay
-- timeline-only). Poll-first (ADR-0124 #8): no webhook dependency for v1.
--
-- 0075 already landed the IG MEDIA + IG COMMENTS bronze and the FB page-inbox DMs
-- (facebook_messages) — but NOT IG DMs. This migration adds only the missing
-- instagram_messages bronze table (the facebook_messages twin) and the lead-hook enum
-- value; the interaction enums it merges into already exist (source 'instagram' and kind
-- 'dm' both predate this — 0075 + ADR-0011), so no interaction-table change is needed.
--
-- Bronze follows the local-pipeline envelope (0038 / 0075): lossless raw_payload, flat
-- text columns the loader coerces to stable strings, PK (tenant_id, source, external_id),
-- content_hash change detection. tenant_id is Imperion's own tenant (first-party asset).
--
-- Enum note: ALTER TYPE … ADD VALUE inside a transaction is fine on PG ≥ 12, but the value
-- is not USED until commit — no seeds here. Idempotent, additive, transactional. No secrets.

BEGIN;

-- ── Enums ────────────────────────────────────────────────────────────────────
-- IG DM senders become leads under their own hook kind (the 'facebook_dm' precedent,
-- 0075). interaction_source 'instagram' (0075) + interaction.kind 'dm' (ADR-0011) already
-- exist — the IG-DM merge reuses them, so nothing to add on the interaction side.
ALTER TYPE lead_hook_kind ADD VALUE IF NOT EXISTS 'instagram_dm';

-- ── Bronze: Instagram Direct Messages ────────────────────────────────────────
-- The facebook_messages twin (0075) for the IG inbox. One flat row per MESSAGE
-- (external_id = the message id). ig_user_id is the business account that owns the inbox
-- (the linked-Page hop resolves it); from_*/to_* are the message participants. DM senders
-- become lead captures downstream (Invoke-ImperionMetaMerge) — these rows carry PII.
CREATE TABLE IF NOT EXISTS instagram_messages (
  conversation_id text, ig_user_id text, message text,
  from_id text, from_username text, to_id text, to_username text, created_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE instagram_messages IS
  'Bronze: Instagram Direct Messages on the IG business inbox. DM senders become lead captures (instagram_dm). LocalPipeline #361.';

-- ── Grants ───────────────────────────────────────────────────────────────────
-- The local pipeline both collects (bronze) and merges (silver) here — the Meta/posture
-- precedent (0075). The silver write surface (interaction, lead_hook, lead_capture_event,
-- contact, contact_social_identity) was already widened for this role by 0075 — re-grant
-- only the new bronze table. The web role reads the new bronze for the Data-sources
-- drill-down (re-grant explicitly for safety, the 0075 pattern). Never DELETE.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON instagram_messages TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON instagram_messages TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
