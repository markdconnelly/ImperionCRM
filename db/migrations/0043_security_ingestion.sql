-- Dark Web ID + Televy ingestion schema (ADR-0040; follows the per-source bronze pattern of
-- ADR-0039). Adds:
--   * silver `credential_exposure` — a compromised-credential record (Dark Web ID), linked to
--     a `contact` (by email) and `account` (by domain) during merge.
--   * bronze `darkwebid_exposures` — raw Dark Web ID compromises (→ credential_exposure).
--   * bronze `televy_reports`      — raw Televy reports (→ existing `assessment_artifact`,
--     source='televy', which already exists from migration 0013).
--   * view `exposure_bronze_all`   — single-source union (symmetry with ADR-0039; future sources).
-- The Azure Functions pipeline (ImperionCRM_Pipeline) lands raw payloads into the bronze tables
-- and a merge folds them into silver. (Distinct from the on-prem local-pipeline bronze in 0038,
-- which uses the tenant_id/source/external_id envelope; these cloud-API sources follow the
-- ADR-0039 per-source shape like autotask/itglue/apollo.)
-- Idempotent and transactional. No secrets (Dark Web ID / Televy API keys live in Key Vault).

BEGIN;

-- ── Silver: credential_exposure (net-new) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS credential_exposure (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid REFERENCES contact(id) ON DELETE SET NULL,  -- compromised person (by email)
  account_id      uuid REFERENCES account(id) ON DELETE SET NULL,  -- owning company (by domain)
  email           text,                                            -- the compromised login/email
  breach_source   text,                                            -- e.g. "LinkedIn 2021"
  breach_date     date,
  exposed_data    text[] NOT NULL DEFAULT '{}',                    -- password|email|phone|…
  password_status text,                                            -- plaintext|hashed|none|unknown
  severity        text,                                            -- low|medium|high (optional)
  status          text NOT NULL DEFAULT 'new',                     -- new|acknowledged|resolved
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, breach_source)                                    -- dedupe a credential per breach
);
COMMENT ON TABLE credential_exposure IS
  'Unified silver compromised-credential record from Dark Web ID monitoring (ADR-0040).';
CREATE INDEX IF NOT EXISTS idx_credential_exposure_contact ON credential_exposure(contact_id);
CREATE INDEX IF NOT EXISTS idx_credential_exposure_account ON credential_exposure(account_id);
CREATE INDEX IF NOT EXISTS idx_credential_exposure_email   ON credential_exposure(lower(email));

-- ── Bronze (ADR-0039 shape): one row per source record, FK set during merge ───────────────────
CREATE TABLE IF NOT EXISTS darkwebid_exposures (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exposure_id       uuid REFERENCES credential_exposure(id) ON DELETE SET NULL,
  external_ref      text UNIQUE,
  payload_bronze    jsonb,
  normalized_silver jsonb,
  summary_gold      text,
  matched_at        timestamptz,
  match_confidence  numeric,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Televy reports stage here, then merge into the existing `assessment_artifact` (source=televy).
CREATE TABLE IF NOT EXISTS televy_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id       uuid REFERENCES assessment_artifact(id) ON DELETE SET NULL,
  external_ref      text UNIQUE,
  payload_bronze    jsonb,
  normalized_silver jsonb,
  summary_gold      text,
  matched_at        timestamptz,
  match_confidence  numeric,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_darkwebid_exposures_exposure ON darkwebid_exposures(exposure_id);
CREATE INDEX IF NOT EXISTS idx_televy_reports_artifact       ON televy_reports(artifact_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['credential_exposure','darkwebid_exposures','televy_reports'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- ── Union read view (single source today; symmetry with ADR-0039 + future sources) ───────────
CREATE OR REPLACE VIEW exposure_bronze_all AS
  SELECT id, 'darkwebid'::text AS source, exposure_id, external_ref, payload_bronze,
         normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at,
         created_at, updated_at
    FROM darkwebid_exposures;

COMMIT;
