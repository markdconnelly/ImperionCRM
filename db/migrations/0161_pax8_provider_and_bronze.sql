-- 0161: Pax8 as a first-class source — provider enum + bronze tables (#1052, epic #1042).
-- Migration number 0161 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY THIS EXISTS. Pax8 is the ONE confirmed-absent source (no provider, no bronze, no
-- silver) — the foundation for license-cost reconciliation (#1041) and the
-- procure→provision→bill loop (#1042). This adds: (1) the `pax8` connection_provider label
-- the company-credential UI writes, and (2) the per-source bronze tables the on-prem
-- collector (ImperionCRM_LocalPipelineEnrichment #279) writes and the merge (#280) reads.
-- Silver mapping (Pax8 license → agreement line / device link) is documented in
-- docs/integrations/pax8-integration.md and built as the merge follow-up (#280) — NOT here.
--
-- Bronze envelope contract (0038/0069/0136/0148): flat columns are text (the loader
-- stringifies; true types + the lossless record live in `raw_payload`), PK
-- (tenant_id, source, external_id), `collected_at` + `content_hash`. `tenant_id` carries the
-- Pax8 partner/account id (Pax8 is the MSP's single distributor account spanning many customer
-- companies; the per-customer key is `company_id` on each row). The collector self-gates until
-- this migration is applied to prod, so the prod tables are EMPTY until then (#1042 is
-- Mark-gated on the credential + apply).
--
-- These are BRONZE: no silver entity yet, so no OKF concept file (the semantic-layer gate does
-- not apply to bronze). The coverage-matrix carries a ⏳ row for the planned silver mapping.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). No secrets; the
-- Pax8 credential lives in Key Vault by reference (ADR-0103). Bronze is PII-adjacent and
-- access-controlled (ADR-0039). The `pax8` enum label is registered but not used in this
-- transaction (bronze rows use plain `source` text), so a single txn is correct (cf. 0149).
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply is Mark-gated).

BEGIN;

-- (1) The provider label the company-credential UI + credential registry write.
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'pax8';

-- (2) Per-source bronze. One table per Pax8 object class the procure→bill loop needs.

-- Customer companies under the MSP's Pax8 account (the join spine for everything below).
CREATE TABLE IF NOT EXISTS pax8_companies (
  pax8_company_id text,              -- Pax8 company id (= company_id on the rows below)
  name text,                         -- company display name
  status text,                       -- 'active' | 'inactive' | ...
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- Active subscriptions — the recurring license commitments (the billing spine).
CREATE TABLE IF NOT EXISTS pax8_subscriptions (
  pax8_subscription_id text,         -- Pax8 subscription id
  company_id text,                   -- owning Pax8 company (= pax8_companies.pax8_company_id)
  product_id text,                   -- Pax8 product id
  product_name text,                 -- product display name (denormalised)
  quantity text,                     -- seat/unit count
  status text,                       -- 'active' | 'cancelled' | 'pendingCancel' | ...
  billing_term text,                 -- 'monthly' | 'annual' | ...
  start_date text,                   -- subscription start (Pax8 timestamp)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- License assignments — who/what a subscription's seats are assigned to (the provision link).
CREATE TABLE IF NOT EXISTS pax8_licenses (
  pax8_license_id text,              -- Pax8 license id
  subscription_id text,              -- owning subscription (= pax8_subscriptions.pax8_subscription_id)
  company_id text,                   -- owning Pax8 company
  product_id text,                   -- Pax8 product id
  assigned_to text,                  -- assignee (user/email/device) when Pax8 exposes it; NULL otherwise
  quantity text,                     -- assigned unit count
  status text,                       -- 'assigned' | 'available' | ...
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- Orders — the procurement events (the procure side of procure→bill).
CREATE TABLE IF NOT EXISTS pax8_orders (
  pax8_order_id text,                -- Pax8 order id
  company_id text,                   -- owning Pax8 company
  status text,                       -- 'completed' | 'processing' | 'failed' | ...
  ordered_at text,                   -- order timestamp (Pax8)
  total text,                        -- order total (currency string; true value in raw_payload)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

COMMENT ON TABLE pax8_companies IS
  'Pax8 bronze (#1052/#1042): customer companies under the MSP Pax8 account. Bronze envelope '
  '(0148). Written by LocalPipeline #279; merged by #280. PII-adjacent, access-controlled.';
COMMENT ON TABLE pax8_subscriptions IS
  'Pax8 bronze (#1052/#1042): recurring subscriptions (the billing spine for #1041 cost recon).';
COMMENT ON TABLE pax8_licenses IS
  'Pax8 bronze (#1052/#1042): license assignments (the provision link → agreement line / device).';
COMMENT ON TABLE pax8_orders IS
  'Pax8 bronze (#1052/#1042): procurement orders (the procure side of the procure→bill loop).';

-- Join keys for the merge (#280): everything laterals on the Pax8 company.
CREATE INDEX IF NOT EXISTS ix_pax8_subscriptions_company ON pax8_subscriptions (company_id);
CREATE INDEX IF NOT EXISTS ix_pax8_licenses_company      ON pax8_licenses (company_id);
CREATE INDEX IF NOT EXISTS ix_pax8_licenses_subscription ON pax8_licenses (subscription_id);
CREATE INDEX IF NOT EXISTS ix_pax8_orders_company        ON pax8_orders (company_id);

-- ── Grants (0148 bronze pattern: LP writes, consumers read) ───────────────────
DO $$
DECLARE
  t text;
  bronze_tables text[] := ARRAY['pax8_companies','pax8_subscriptions','pax8_licenses','pax8_orders'];
BEGIN
  FOREACH t IN ARRAY bronze_tables LOOP
    -- On-prem LocalPipeline is the writer (it ingests + merges Pax8).
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO "imperion-localpipeline"', t);
    END IF;
    -- Cloud pipeline, backend, and web read.
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
END $$;

COMMIT;
