-- 0106: Security-posture bronze drain — three already-shipped collectors get their
-- front-end-owned bronze tables (schema ownership, system CLAUDE.md §1; per-source
-- bronze ADR-0039; all-text local-pipeline envelope per the 0080 DNS-posture contract).
--
-- One migration, one author (≤1 FE migration-author per wave, §10.3) bundling three
-- related security-posture bronze tables whose readers/collectors already shipped and
-- self-gate until this lands:
--   • m365_sensitivity_labels             — #575 / #259 read surface (src/lib/security/sensitivity-csa.ts)
--   • entra_custom_security_attributes    — #575 / #259 read surface (same reader)
--   • easydmarc_domains                   — #581 / new source (collector LocalPipeline #122)
--
-- CONVENTION (0080 contract): flat columns are text — the on-prem loader stringifies,
-- true types + the lossless original live in raw_payload. PK (tenant_id, source,
-- external_id). content_hash for change detection. Bronze stays permissive (no CHECK).
-- The #259 sensitivity/CSA card and the EasyDMARC posture surface light up automatically
-- once this is applied — no FE change needed (schema-lag-tolerant readers, #301/#302).
--
-- Grants (0080 pattern): collector writer (imperion-localpipeline) gets idempotent-upsert
-- rights (SELECT/INSERT/UPDATE, never DELETE); cloud pipeline + backend + web read.
-- Additive, idempotent, transactional. No secrets. No PII (label/attribute/domain
-- metadata only).

BEGIN;

-- ── Bronze: M365 / Purview sensitivity labels (#575, #259; collector local #141) ──────
-- One row per label observed in a mapped customer tenant. external_id = the Purview
-- label id. Read account-scoped via account_tenant (ADR-0051).
CREATE TABLE IF NOT EXISTS m365_sensitivity_labels (
  label_id   text NOT NULL,            -- Purview label id (also the external_id)
  name       text,                     -- display name
  priority   text,                     -- lower = more sensitive (Purview ordering); text in bronze
  is_active  text,                     -- 'true'|'false' — collector stringifies
  collected_at text NOT NULL,
  tenant_id  text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE m365_sensitivity_labels IS
  'Bronze (ADR-0039, 0080 all-text envelope): Microsoft Purview / M365 sensitivity labels per mapped tenant (#575, read surface #259). external_id = Purview label id. Written by the on-prem collector (local #141); read account-scoped via account_tenant. priority/is_active are text (true types in raw_payload).';

-- ── Bronze: Entra custom security attribute DEFINITIONS (#575, #259; local #141) ──────
-- One row per CSA definition (attribute set + name) observed in a mapped tenant. The
-- #259 surface benchmarks these against the MSP STANDARD_CSA_SET. external_id =
-- '<attribute_set>|<name>'. Definitions only — assignments are out of scope (the reader
-- reads definitions; add an assignments table when a collector needs it).
CREATE TABLE IF NOT EXISTS entra_custom_security_attributes (
  attribute_set text NOT NULL,         -- the CSA attribute set
  name       text NOT NULL,            -- the attribute name (benchmarked, case-insensitive)
  data_type  text,                     -- String|Integer|Boolean (text from bronze)
  status     text,                     -- Available|Deprecated etc.
  collected_at text NOT NULL,
  tenant_id  text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE entra_custom_security_attributes IS
  'Bronze (ADR-0039, 0080 all-text envelope): Entra custom security attribute DEFINITIONS per mapped tenant (#575, read surface #259). external_id = ''<attribute_set>|<name>''. Written by the on-prem collector (local #141); the #259 card benchmarks observed names against the MSP standard set. Definitions only (no assignments).';

-- ── Bronze: EasyDMARC per-domain email-authentication posture (#581; local #122) ──────
-- New source. One row per domain's DMARC/SPF/DKIM/BIMI posture + setup status.
-- external_id = the domain name. Field names are best-effort from EasyDMARC docs (no
-- live key yet); raw_payload is lossless, so casing/name drift is recoverable without a
-- migration. The aggregate-report (RUA) table is deferred (#581) until a live key exists.
CREATE TABLE IF NOT EXISTS easydmarc_domains (
  domain           text NOT NULL,      -- the domain (also the external_id)
  organization_ref text,               -- EasyDMARC org id (→ tenant mapping, follow-up)
  setup_status     text,               -- EasyDMARC verification/setup state
  dmarc_policy     text,               -- none|quarantine|reject
  dmarc_status     text,
  spf_status       text,
  dkim_status      text,
  bimi_status      text,
  collected_at text NOT NULL,
  tenant_id  text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE easydmarc_domains IS
  'Bronze (ADR-0039, 0080 all-text envelope): EasyDMARC per-domain email-authentication posture — new source (#581; collector local #122, gated on this + the API key). external_id = domain. DMARC/SPF/DKIM/BIMI status + setup_status; lossless raw_payload tolerates field drift. Aggregate-report (RUA) table deferred. A silver posture entity will need an OKF concept file at the silver-merge, not here.';

-- ── Grants (0080 pattern — collector writes idempotent upserts; consumers read) ───────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['m365_sensitivity_labels','entra_custom_security_attributes','easydmarc_domains'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO "imperion-localpipeline"', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmpipeline"', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmbackendfunction"', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrm-web-prd"', t);
    END IF;
  END LOOP;
  RAISE NOTICE 'absent roles (if any) skipped — grants are best-effort per env.';
END $$;

COMMIT;
