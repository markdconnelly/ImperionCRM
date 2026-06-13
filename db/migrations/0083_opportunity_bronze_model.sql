-- 0083: Opportunity as a merged silver from three bronze sources (#428, ADR-0080, ADR-0039).
--
-- CORRECTION of the mis-modeled kqm_proposals (0038). KQM is NOT a standalone quote
-- object — it is ONE bronze source of the `opportunity`. Autotask has its own opportunity
-- entity; the website has one too (manual sales entry). The three merge → silver
-- `opportunity` (the object the app uses), each contributing unique fields; the KQM
-- autotask_* ids are the join keys across sources.
--
-- CONVENTION: opportunity is ingested by the on-prem LOCAL-PIPELINE (ADR-0080), so its
-- bronze follows the LP lossless-envelope style (0038: tenant_id/source/external_id/
-- collected_at/raw_payload/content_hash, flat text columns, true types in raw_payload) —
-- the same shape as the sibling kqm_proposals/autotask_contracts the LP already writes,
-- NOT the cloud-pipeline silver-aggregate style (0036). The website source writes via the
-- web app with the same envelope (source='website', highest merge precedence per ADR-0039).
--
-- KQM flat columns are the LIVE-VERIFIED shape (spike #427): status is an INT enum
-- (1 open/2 sent/3 WON/90 dead); the header has NO total (silver sums selected lines);
-- the autotask_* ids are the sale→delivery seam. Line/section/order detail are their own
-- lossless tables (KQM has no header total; value = Σ selected lines, MRR vs one-off by
-- is_recurring) and are not server-filterable by quote → LP pulls full + joins in silver.
--
-- SCOPE: bronze tables + the union view only. The silver `opportunity` MERGE recompute
-- (precedence website > autotask > kqm over opportunity_bronze_all) is a pipeline-repo
-- transform (ADR-0039 pattern) — a follow-up slice; this migration does NOT touch the
-- live silver `opportunity` table. Additive, idempotent, transactional. No secrets.

BEGIN;

-- Retire the mis-modeled, empty kqm_proposals (0038) — never populated (no KQM ingest yet).
DROP TABLE IF EXISTS kqm_proposals;

-- ── KQM opportunity (quote header — verified live shape, spike #427) ───────────────────
CREATE TABLE IF NOT EXISTS kqm_opportunities (
  quote_number            text, code text, title text,
  status                  text,   -- INT enum as text (bronze is text): 1 open/2 sent/3 WON/90 dead
  sales_order_id          text,   -- present ⇔ won (status 3)
  customer_id             text,   -- KQM-internal account id
  autotask_opportunity_id text,   -- the sale→delivery seam (join key)
  autotask_organization_id text,  -- Autotask company (join key)
  autotask_quote_id       text,
  contact_name            text, contact_email text, owner_employee_id text,
  created_date            text, modified_date text, expiry_date text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE kqm_opportunities IS
  'KQM quote header as a bronze source of the opportunity (#428, verified #427). status is an int enum (3=WON); no header total — silver sums selected lines. autotask_* ids join to the Autotask opportunity.';

-- KQM child detail (lossless; value computation in silver). Sections group lines; lines
-- carry price/qty/discount + is_recurring (MRR vs one-off). Orders mirror the won quote.
CREATE TABLE IF NOT EXISTS kqm_opportunity_sections (
  quote_id text, type text, line_number text, is_multi_choice text, is_selected text, title text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS kqm_opportunity_lines (
  quote_section_id text, line_number text, product_id text, product_number text,
  title text, description text, price text, quantity text, tax text, tax_rate text,
  discount_method text, discount_value text, is_optional text, is_selected text,
  is_recurring text, recurring_type text, recurring_duration text, created_date text, modified_date text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS kqm_sales_orders (
  quote_id text, order_number text, order_date text, status text, fulfillment_status text,
  entry_type text, customer_id text, created_date text, modified_date text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
CREATE TABLE IF NOT EXISTS kqm_sales_order_lines (
  sales_order_id text, product_id text, line_number text, cost text, price text, tax text,
  tax_rate text, quantity text, title text, description text, serial_numbers text,
  is_recurring text, recurring_type text, recurring_duration text, created_date text, modified_date text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);

-- ── Autotask opportunity (curated subset + raw_payload; flat columns refined by #430) ──
CREATE TABLE IF NOT EXISTS autotask_opportunities (
  company_id text,                 -- Autotask companyID (join to KQM autotask_organization_id)
  title text, status text, stage text, amount text, cost text, probability text,
  projected_close_date text, owner_resource_id text, quote_id text,
  created_date text, last_activity_date text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE autotask_opportunities IS
  'Autotask Opportunity entity as a bronze source of the opportunity (#428). external_id = Autotask opportunity id ⟵ KQM autotask_opportunity_id. Flat columns are a best-effort subset pending the #430 field-metadata probe; raw_payload is lossless.';

-- ── Website opportunity (manual sales entry — notes + uploaded knowledge; #429) ────────
CREATE TABLE IF NOT EXISTS website_opportunities (
  title text, stage text, amount text, close_date text,
  account_ref text,                -- the Imperion account this belongs to
  owner_user_id text, notes text,
  knowledge_blob_refs jsonb,       -- pointers to uploaded knowledge files (Azure Blob, #429/ADR-0069)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE website_opportunities IS
  'Manual sales-team opportunity entry (#429): notes + uploaded customer knowledge. Highest merge precedence (website_* outranks machine sources, ADR-0039 resurrection guard).';

-- ── Union view for the silver merge (shared projection across the three sources) ───────
CREATE OR REPLACE VIEW opportunity_bronze_all AS
  SELECT tenant_id, 'kqm'::text AS source, external_id, title,
         status AS status_raw, autotask_opportunity_id,
         autotask_organization_id AS account_external_ref, collected_at, raw_payload
    FROM kqm_opportunities
  UNION ALL
  SELECT tenant_id, 'autotask', external_id, title,
         status, external_id AS autotask_opportunity_id,
         company_id AS account_external_ref, collected_at, raw_payload
    FROM autotask_opportunities
  UNION ALL
  SELECT tenant_id, 'website', external_id, title,
         stage AS status_raw, NULL::text AS autotask_opportunity_id,
         account_ref AS account_external_ref, collected_at, raw_payload
    FROM website_opportunities;
COMMENT ON VIEW opportunity_bronze_all IS
  'Per-source opportunity bronze unioned for the silver merge (#428, ADR-0039). Precedence website > autotask > kqm. autotask_opportunity_id is the cross-source join key.';

-- ── Grants (0044/0081 defensive pattern; roles may be absent in some envs) ─────────────
DO $$
DECLARE
  lp_tables  text[] := ARRAY['kqm_opportunities','kqm_opportunity_sections','kqm_opportunity_lines',
                             'kqm_sales_orders','kqm_sales_order_lines','autotask_opportunities'];
  t text;
BEGIN
  -- Local-pipeline writes the KQM + Autotask opportunity bronze (it ingests them).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    FOREACH t IN ARRAY lp_tables LOOP
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO "imperion-localpipeline"', t);
    END LOOP;
    GRANT SELECT ON website_opportunities TO "imperion-localpipeline";
  ELSE RAISE NOTICE 'role imperion-localpipeline absent — skipping LP grants.'; END IF;

  -- Web writes website_opportunities (the sales GUI, #429); reads the rest for display.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON website_opportunities TO "mgid-imperioncrm-web-prd";
    FOREACH t IN ARRAY lp_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrm-web-prd"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.'; END IF;

  -- Backend + cloud-pipeline read (merge consumes the bronze; agent reads the picture).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    FOREACH t IN ARRAY lp_tables || ARRAY['website_opportunities'] LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmbackendfunction"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.'; END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    FOREACH t IN ARRAY lp_tables || ARRAY['website_opportunities'] LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmpipeline"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.'; END IF;
END $$;

COMMIT;
