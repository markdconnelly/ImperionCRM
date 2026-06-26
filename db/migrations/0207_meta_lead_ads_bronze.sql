-- Meta Lead Ads — instant-form lead capture bronze (LP #362, transferred from backend #424).
--
-- The App Review use case "capture & manage ad leads" (permission `leads_retrieval`):
-- Facebook/Instagram Lead Ads (instant forms) are read from the company Page with the
-- `conn-company-meta` Page access token (which must carry `leads_retrieval`) by the
-- on-prem local pipeline (bulk-ingestion + merge-co-locates-with-ingestion, ADR-0042 /
-- LP ADR-0026). The local repo also MERGES these to silver `lead_hook` /
-- `lead_capture_event` (front-end ADR-0124 decision 6 — Ad Lead → capture-inbox lead;
-- `source = meta_lead_ad`). This is a SEPARATE track from the Meta Marketing push
-- (#406) and the organic social ingestion (migration 0075).
--
-- Two bronze tables follow the 0075 envelope (lossless raw_payload, flat text columns
-- the loader coerces to stable strings, PK (tenant_id, source, external_id),
-- content_hash change detection, `collected_at text NOT NULL`). tenant_id is Imperion's
-- own tenant (first-party Page asset, not client data). source = 'meta_lead_ad'.
--
--   1. meta_lead_ad_forms — the leadgen forms discovered under the Page
--      (/{page-id}/leadgen_forms). Form metadata only (no PII). Drives the lead_hook
--      config in the merge.
--   2. meta_lead_ads      — submitted leads (/{form-id}/leads). field_data answers are
--      PII-adjacent: access-controlled, never logged (ADR-0086). The merge resolves each
--      leadgen id → ONE lead_capture_event (idempotent on the Meta leadgen id).
--
-- No silver tables are created here — silver `lead_hook` / `lead_capture_event` /
-- `contact` / `contact_social_identity` already exist (0022 + 0075). `facebook_lead` is
-- already a value of `lead_hook_kind` (0022). Idempotent, additive, transactional. No
-- secrets — the Page token lives in Key Vault by reference (ADR-0103), never here.

BEGIN;

-- ── Bronze: Lead Ad forms (discovered per Page) ──────────────────────────────
-- Form definition + per-field schema. No submitted PII — the questions, not the
-- answers. external_id = the Meta leadgen form id.
CREATE TABLE IF NOT EXISTS meta_lead_ad_forms (
  page_id text, form_name text, status text, locale text,
  questions text, context_card text, follow_up_action_url text,
  leads_count text, created_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE meta_lead_ad_forms IS
  'Bronze: Meta Lead Ad (leadgen) form definitions under the company Page (LP #362). Form metadata only; no submitted PII. Drives the lead_hook config in the merge.';

-- ── Bronze: submitted leads ──────────────────────────────────────────────────
-- One row per submitted lead (Meta leadgen id). field_data holds the form answers
-- (email/phone/name/…): PII-adjacent — access-controlled, never logged. ad/campaign/
-- form ids carry the attribution. DM senders → leads precedent (0075), here the
-- form submitter is the lead.
CREATE TABLE IF NOT EXISTS meta_lead_ads (
  form_id text, page_id text, ad_id text, ad_name text,
  adset_id text, campaign_id text, campaign_name text, platform text,
  is_organic text, field_data text, full_name text, email text, phone_number text,
  created_time text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE meta_lead_ads IS
  'Bronze: submitted Meta Lead Ads (instant-form leads) under the company Page (LP #362, leads_retrieval). field_data answers are PII-adjacent — access-controlled, never logged (ADR-0086). Each leadgen id merges to ONE lead_capture_event (source=meta_lead_ad, ADR-0124 #6).';

CREATE INDEX IF NOT EXISTS idx_meta_lead_ads_form ON meta_lead_ads(form_id);

-- ── Grants ───────────────────────────────────────────────────────────────────
-- The local pipeline both collects (bronze) and merges (silver) here — the 0075
-- posture-merge precedent (LP ADR-0026). The silver write surface (lead_hook,
-- lead_capture_event, contact, contact_social_identity) was already granted to the
-- local-pipeline role by 0075; this migration only adds the two new bronze tables.
-- Never DELETE (0044 posture).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON
      meta_lead_ad_forms, meta_lead_ads
      TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;

  -- Web role reads the bronze for the Data-sources drill-down (the 0075 precedent).
  -- meta_lead_ads carries PII-adjacent field_data — surfaced read-only, access-controlled
  -- by the app's row/role policy; never widened beyond the existing web read posture.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON
      meta_lead_ad_forms, meta_lead_ads
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
END $$;

COMMIT;
