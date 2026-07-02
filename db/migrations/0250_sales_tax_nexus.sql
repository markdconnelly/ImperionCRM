-- 0250: sales-tax nexus model — `tax_jurisdiction` / `tax_nexus_registration` / `tax_filing`
-- / `tax_taxability_rule` (#1620, epic #1534 — $100M gap-fill Cluster 2, finance-at-scale #1626).
-- The sales-tax nexus & filings procedure (09-20: Audrey computes, Sterling governs cadence,
-- the HUMAN files) needs a persisted tax-nexus model: jurisdiction registrations, nexus
-- thresholds (economic + physical), taxability by product category/state, and the filing
-- calendar the B9 deadline-sentinel watches (T-30/T-7/T-1 lead times; never auto-files).
--
-- These are IMPERION'S OWN tax obligations (company scope, `financial` data_class), NOT
-- per-client data. External SoR is the tax engine / accountant — Imperion MIRRORS the
-- registration + filing state and runs the sentinel on due dates; the filing itself is a
-- human external attestation (B4 always_gate). Agents propose; a backend executor writes
-- (approval-gated, never a direct silver write); web renders read-only.
--
-- Migration number 0250 is ASSIGNED for the coordinated #1534 schema batch and re-verified
-- at MERGE per system CLAUDE.md §10.3 — if another migration lands on this number during
-- the CI window, renumber this file + every reference (concept files, coverage-matrix rows,
-- the PR body).
--
-- ARCHETYPES: `tax_jurisdiction` + `tax_taxability_rule` = reference/config (H);
-- `tax_nexus_registration` + `tax_filing` = single-source-of-record silver mirrors (B) of the
-- tax engine / accountant, acted on by the B9 deadline-sentinel + B4 audit-attest procedure.
--
-- data_class FINANCIAL (always-gate). Seeds NOTHING (jurisdictions/thresholds are curated or
-- tax-engine-fed at runtime). No PII anywhere in this model.
--
-- New silver entities → NEW OKF concept files (docs/database/semantic-layer/tables/tax_*.md)
-- + coverage-matrix rows + index rows in THIS PR (system CLAUDE.md §11; semantic-layer gate).
-- Frontend-owned schema (ADR-0042). Additive + idempotent + transactional. Least-priv grants
-- (ADR-0127): web SELECT-only; backend full DML; pipelines SELECT.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply Mark-gated).

BEGIN;

-- ── tax_jurisdiction_level: the level of the taxing jurisdiction ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_jurisdiction_level') THEN
    CREATE TYPE tax_jurisdiction_level AS ENUM ('country', 'state', 'county', 'city', 'district');
  END IF;
END $$;

-- ── tax_nexus_basis: what establishes nexus in a jurisdiction ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_nexus_basis') THEN
    CREATE TYPE tax_nexus_basis AS ENUM ('economic', 'physical', 'affiliate', 'marketplace');
  END IF;
END $$;

-- ── tax_registration_status: Imperion's registration lifecycle per jurisdiction ────────────
-- monitoring (sentinel watches revenue vs threshold) → approaching_threshold (proximity
-- flag) → registration_required (threshold crossed / physical presence — nexus determined)
-- → registered (human registered with the authority) → deregistered. not_registered = a
-- resolved determination of NO nexus (still recorded, with the citation).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_registration_status') THEN
    CREATE TYPE tax_registration_status AS ENUM (
      'monitoring', 'approaching_threshold', 'registration_required',
      'registered', 'not_registered', 'deregistered'
    );
  END IF;
END $$;

-- ── tax_filing_frequency: the jurisdiction-assigned filing cadence ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_filing_frequency') THEN
    CREATE TYPE tax_filing_frequency AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual');
  END IF;
END $$;

-- ── tax_filing_status: the filing-calendar lifecycle (B9 sentinel watches these) ───────────
-- upcoming → in_preparation (Audrey quantifies + pre-stages the package) → filed (human
-- attested externally) → paid; late = a logged escalation failure (passed deadline);
-- amended / waived close the loop on corrections and zero-liability waivers.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_filing_status') THEN
    CREATE TYPE tax_filing_status AS ENUM (
      'upcoming', 'in_preparation', 'filed', 'paid', 'late', 'amended', 'waived'
    );
  END IF;
END $$;

-- ── tax_taxability_treatment: how a product category is treated in a jurisdiction ──────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_taxability_treatment') THEN
    CREATE TYPE tax_taxability_treatment AS ENUM ('taxable', 'exempt', 'reduced', 'unknown');
  END IF;
END $$;

-- ── tax_record_source: provenance of a mirrored tax row ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_record_source') THEN
    CREATE TYPE tax_record_source AS ENUM ('tax_engine', 'accountant', 'curated');
  END IF;
END $$;

-- ── tax_jurisdiction: the taxing jurisdiction + its nexus thresholds (reference, H) ────────
CREATE TABLE IF NOT EXISTS tax_jurisdiction (
  id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                              text NOT NULL,                         -- 'Pennsylvania', 'Philadelphia'
  level                             tax_jurisdiction_level NOT NULL DEFAULT 'state',
  country_code                      text NOT NULL DEFAULT 'US',            -- ISO 3166-1 alpha-2
  region_code                       text,                                  -- state/province code: 'PA'
  parent_jurisdiction_id            uuid REFERENCES tax_jurisdiction(id) ON DELETE SET NULL,
  economic_nexus_sales_threshold    numeric(14,2),                         -- e.g. 100000.00
  economic_nexus_transaction_threshold integer,                            -- e.g. 200
  threshold_measurement_period      text NOT NULL DEFAULT 'calendar_year', -- 'calendar_year' | 'rolling_12m' | 'prior_or_current_year'
  tax_authority_name                text,                                  -- 'PA Department of Revenue'
  tax_authority_url                 text,
  notes                             text,
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),
  -- One row per jurisdiction identity (upsert key for the curated/tax-engine feed).
  CONSTRAINT tax_jurisdiction_uniq UNIQUE (country_code, region_code, level, name)
);
COMMENT ON TABLE tax_jurisdiction IS
  'Reference (archetype H): a taxing jurisdiction + its nexus thresholds (economic sales/transaction thresholds, measurement period) and authority contact surface (#1620, epic #1534). Curated or tax-engine-fed; the 09-20 sentinel evaluates taxable revenue against these thresholds. Company-scope FINANCIAL data_class (always-gate); no PII. Migration 0250 (batch-assigned — re-verified at merge).';

CREATE INDEX IF NOT EXISTS idx_tax_jurisdiction_region ON tax_jurisdiction (country_code, region_code);

-- ── tax_nexus_registration: Imperion's registration state per jurisdiction (silver, B) ─────
CREATE TABLE IF NOT EXISTS tax_nexus_registration (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id       uuid NOT NULL REFERENCES tax_jurisdiction(id) ON DELETE CASCADE,
  status                tax_registration_status NOT NULL DEFAULT 'monitoring',
  nexus_basis           tax_nexus_basis,                    -- what triggered nexus (null while monitoring)
  nexus_established_on  date,                               -- when nexus was determined to exist
  registered_on         date,                               -- when the human registered with the authority
  registration_number   text,                               -- the permit/license number (mirror; NOT a secret)
  filing_frequency      tax_filing_frequency,               -- jurisdiction-assigned cadence
  deregistered_on       date,
  external_ref          text,                               -- tax engine / accountant reference id
  source                tax_record_source NOT NULL DEFAULT 'curated',
  determination_citation text,                              -- the rule + revenue source + as-of behind the determination (A5)
  notes                 text,
  as_of                 timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  -- Imperion is one legal entity: exactly one registration row per jurisdiction.
  CONSTRAINT tax_nexus_registration_jurisdiction_uniq UNIQUE (jurisdiction_id)
);
COMMENT ON TABLE tax_nexus_registration IS
  'Silver mirror (archetype B): Imperion''s OWN sales-tax registration state per jurisdiction (#1620). External SoR = tax engine / accountant; the 09-20 procedure PROPOSES status transitions (nexus determinations, citation-backed per A5) and the human registers with the authority — a backend executor writes (approval-gated, never a direct silver write). One row per jurisdiction (single legal entity). FINANCIAL data_class (always-gate); no PII. Migration 0250 (batch-assigned — re-verified at merge).';

CREATE INDEX IF NOT EXISTS idx_tax_nexus_registration_status ON tax_nexus_registration (status);

-- ── tax_filing: the filing calendar + status (silver, B; the B9 sentinel clock) ────────────
CREATE TABLE IF NOT EXISTS tax_filing (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id       uuid NOT NULL REFERENCES tax_nexus_registration(id) ON DELETE CASCADE,
  period_start          date NOT NULL,
  period_end            date NOT NULL,
  due_date              date NOT NULL,                      -- THE sentinel clock (T-30/T-7/T-1 lead times)
  status                tax_filing_status NOT NULL DEFAULT 'upcoming',
  gross_sales           numeric(14,2),                      -- the tie-out: taxable base, rate → liability
  taxable_sales         numeric(14,2),
  tax_collected         numeric(14,2),
  tax_due               numeric(14,2),
  tax_paid              numeric(14,2),
  filed_on              date,                               -- when the human filed (external attestation)
  paid_on               date,
  confirmation_number   text,                               -- authority confirmation (mirror)
  external_ref          text,
  source                tax_record_source NOT NULL DEFAULT 'curated',
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  -- One filing per registration × period (upsert key for calendar generation).
  CONSTRAINT tax_filing_period_uniq UNIQUE (registration_id, period_start, period_end),
  CONSTRAINT tax_filing_period_valid CHECK (period_end >= period_start)
);
COMMENT ON TABLE tax_filing IS
  'Silver mirror (archetype B): the sales-tax filing calendar + status per registration × period (#1620). due_date is the B9 deadline-sentinel''s clock (T-30/T-7/T-1 escalation, rising urgency up reports_to; a passed deadline = a logged escalation failure) — the sentinel NEVER auto-files; the filing is the human''s external attestation (B4, always_gate; authority = external SoR). Audrey quantifies the tie-out (taxable base, rate, liability, as-of); a backend executor writes (approval-gated). FINANCIAL data_class (always-gate); no PII. Migration 0250 (batch-assigned — re-verified at merge).';

CREATE INDEX IF NOT EXISTS idx_tax_filing_registration ON tax_filing (registration_id);
CREATE INDEX IF NOT EXISTS idx_tax_filing_due          ON tax_filing (due_date);
CREATE INDEX IF NOT EXISTS idx_tax_filing_status       ON tax_filing (status);

-- ── tax_taxability_rule: taxability by product category × jurisdiction (reference, H) ──────
CREATE TABLE IF NOT EXISTS tax_taxability_rule (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id   uuid NOT NULL REFERENCES tax_jurisdiction(id) ON DELETE CASCADE,
  product_category  text NOT NULL,                          -- SKU class: 'managed_services', 'saas', 'hardware', 'professional_services', 'shipping'
  treatment         tax_taxability_treatment NOT NULL DEFAULT 'unknown',
  rate_hint         numeric(6,4),                           -- advisory rate (e.g. 0.0600); engine/authority remains authoritative
  effective_from    date NOT NULL DEFAULT '2000-01-01',
  effective_to      date,                                   -- null = current
  basis_citation    text,                                   -- statute / ruling / engine rule behind the treatment (A5)
  source            tax_record_source NOT NULL DEFAULT 'curated',
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- One rule per jurisdiction × category × effective window start (upsert key; supersede via effective_to).
  CONSTRAINT tax_taxability_rule_uniq UNIQUE (jurisdiction_id, product_category, effective_from)
);
COMMENT ON TABLE tax_taxability_rule IS
  'Reference (archetype H): taxability of a product/SKU category in a jurisdiction (#1620) — treatment (taxable/exempt/reduced/unknown) + advisory rate hint + the statute/ruling citation (A5), effective-dated. Feeds the 09-20 quantify step (taxable base per jurisdiction). Curated or tax-engine-fed; the engine/authority stays authoritative for rates. FINANCIAL data_class (always-gate); no PII. Migration 0250 (batch-assigned — re-verified at merge).';

CREATE INDEX IF NOT EXISTS idx_tax_taxability_rule_jurisdiction ON tax_taxability_rule (jurisdiction_id);

-- ── updated_at triggers (the 0210/0223/0237/0243 convention) ───────────────────────────────
DROP TRIGGER IF EXISTS trg_tax_jurisdiction_updated ON tax_jurisdiction;
CREATE TRIGGER trg_tax_jurisdiction_updated BEFORE UPDATE ON tax_jurisdiction
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_tax_nexus_registration_updated ON tax_nexus_registration;
CREATE TRIGGER trg_tax_nexus_registration_updated BEFORE UPDATE ON tax_nexus_registration
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_tax_filing_updated ON tax_filing;
CREATE TRIGGER trg_tax_filing_updated BEFORE UPDATE ON tax_filing
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_tax_taxability_rule_updated ON tax_taxability_rule;
CREATE TRIGGER trg_tax_taxability_rule_updated BEFORE UPDATE ON tax_taxability_rule
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants (ADR-0127 least-priv): web reads (render); backend reads+writes (the tax-nexus
--    persist executor, approval-gated, never a direct silver write); pipeline + local-pipeline
--    read. Defensive (roles may be absent), mirroring 0237/0243's block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON tax_jurisdiction, tax_nexus_registration, tax_filing, tax_taxability_rule
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON tax_jurisdiction, tax_nexus_registration, tax_filing, tax_taxability_rule
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON tax_jurisdiction, tax_nexus_registration, tax_filing, tax_taxability_rule
      TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON tax_jurisdiction, tax_nexus_registration, tax_filing, tax_taxability_rule
      TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grants.';
  END IF;
END $$;

COMMIT;
