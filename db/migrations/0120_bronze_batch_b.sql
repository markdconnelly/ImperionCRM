-- 0120:
-- bronze-batch-B — finance/logistics/interaction landing tables (#688).
--
-- FE owns the table names (system CLAUDE.md §1 — this repo is the schema source of
-- truth; the siblings are consumers). The on-prem LOCAL-PIPELINE collectors for
-- LP #197 (finance — QBO full read-only pull), LP #198 (logistics — Amazon Business +
-- CDW), and LP #199 (scoped interaction — m365_email/m365_teams Derek/Mark↔clients)
-- fail loudly until these bronze landing tables exist. This migration creates them
-- and nothing else.
--
-- CONVENTION (mirrors 0119_bronze_batch_a.sql / 0083_opportunity_bronze_model.sql,
-- ADR-0039): every table is a lossless-envelope bronze landing — flat text columns for
-- the curated, server-queryable subset + the lossless `raw_payload jsonb` carrying the
-- true-typed original. Envelope = tenant_id/source/external_id/collected_at/raw_payload/
-- content_hash, PK (tenant_id, source, external_id). The LP writes these; web/backend/
-- cloud-pipeline read. QBO columns follow the 0092 (qbo_purchases) style.
--
-- SCOPE: bronze landing tables only. NO silver entity is touched (so NO OKF concept-file
-- change — bronze tables are not silver entities). Silver merges / collectors live in the
-- LP + cloud-pipeline repos and are gated on this migration.
--
-- FINANCE (LP #197): QBO full read-only pull reusing the existing `conn-company-qbo`
-- read-only connection — the app never writes to QuickBooks. qbo_purchases already exists
-- (0092) and is NOT recreated here. Field names/casing are modeled from the documented
-- Intuit Accounting API v3 and are recoverable via the lossless `raw_payload` if they drift.
--
-- INTERACTION (LP #199): the Derek/Mark↔clients allowlist filter is applied LP-SIDE at
-- collection (config-driven), NOT in this schema — these tables land only what the
-- collector already scoped. No message bodies beyond a short preview are curated; the
-- lossless original lives in raw_payload.
--
-- Additive, idempotent (CREATE TABLE IF NOT EXISTS), transactional. No secrets.

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════════════
--  Finance / QBO (LP #197) — full read-only pull on conn-company-qbo
-- ════════════════════════════════════════════════════════════════════════════════════

-- ── QBO invoices (A/R — money owed to the MSP) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qbo_invoices (
  doc_number        text,   -- Invoice.DocNumber
  customer_ref      text,   -- Invoice.CustomerRef.value (joins qbo_customers.customer_id)
  customer_name     text,   -- Invoice.CustomerRef.name
  txn_date          text,   -- Invoice.TxnDate
  due_date          text,   -- Invoice.DueDate
  total_amount      text,   -- Invoice.TotalAmt (backend casts)
  balance           text,   -- Invoice.Balance (open A/R)
  currency          text,   -- Invoice.CurrencyRef.value
  email_status      text,   -- Invoice.EmailStatus
  last_updated_time text,   -- Invoice.MetaData.LastUpdatedTime (incremental pull cursor)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE qbo_invoices IS
  'Bronze: QuickBooks Online Invoices (A/R) as a lossless envelope (LP #197). Read-only — the app never writes to QBO. external_id = QBO Invoice Id; customer_ref joins qbo_customers. raw_payload is lossless incl. Line[].';

-- ── QBO payments (customer payments received against invoices) ─────────────────────────
CREATE TABLE IF NOT EXISTS qbo_payments (
  customer_ref      text,   -- Payment.CustomerRef.value (joins qbo_customers.customer_id)
  customer_name     text,   -- Payment.CustomerRef.name
  txn_date          text,   -- Payment.TxnDate
  total_amount      text,   -- Payment.TotalAmt
  unapplied_amount  text,   -- Payment.UnappliedAmt
  payment_method    text,   -- Payment.PaymentMethodRef.name
  deposit_account   text,   -- Payment.DepositToAccountRef.name
  currency          text,   -- Payment.CurrencyRef.value
  last_updated_time text,   -- Payment.MetaData.LastUpdatedTime (incremental pull cursor)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE qbo_payments IS
  'Bronze: QuickBooks Online customer Payments (received against invoices) as a lossless envelope (LP #197). Read-only. external_id = QBO Payment Id; customer_ref joins qbo_customers. Applied invoice links in raw_payload (Line[].LinkedTxn[]).';

-- ── QBO customers (the billed entity in QBO — maps to the silver account) ──────────────
CREATE TABLE IF NOT EXISTS qbo_customers (
  customer_id       text,   -- Customer.Id (join target for qbo_invoices/qbo_payments/qbo_estimates)
  display_name      text,   -- Customer.DisplayName
  company_name      text,   -- Customer.CompanyName
  active            text,   -- Customer.Active
  balance           text,   -- Customer.Balance (total open A/R)
  currency          text,   -- Customer.CurrencyRef.value
  created_time      text,   -- Customer.MetaData.CreateTime
  last_updated_time text,   -- Customer.MetaData.LastUpdatedTime (incremental pull cursor)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE qbo_customers IS
  'Bronze: QuickBooks Online Customers (the billed entity) as a lossless envelope (LP #197). Read-only. external_id = customer_id; maps LP-side to the silver account. PII (contact email/phone/address) stays in raw_payload, not curated here.';

-- ── QBO estimates (quotes — pre-invoice) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qbo_estimates (
  doc_number        text,   -- Estimate.DocNumber
  customer_ref      text,   -- Estimate.CustomerRef.value (joins qbo_customers.customer_id)
  customer_name     text,   -- Estimate.CustomerRef.name
  txn_date          text,   -- Estimate.TxnDate
  expiration_date   text,   -- Estimate.ExpirationDate
  txn_status        text,   -- Estimate.TxnStatus (Pending | Accepted | Closed | Rejected)
  total_amount      text,   -- Estimate.TotalAmt
  currency          text,   -- Estimate.CurrencyRef.value
  last_updated_time text,   -- Estimate.MetaData.LastUpdatedTime (incremental pull cursor)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE qbo_estimates IS
  'Bronze: QuickBooks Online Estimates (quotes) as a lossless envelope (LP #197). Read-only. external_id = QBO Estimate Id; customer_ref joins qbo_customers. Line[] in raw_payload.';

-- ── QBO bills (A/P — vendor bills; modeled-dormant on Simple Start, cf. 0092) ──────────
CREATE TABLE IF NOT EXISTS qbo_bills (
  doc_number        text,   -- Bill.DocNumber
  vendor_ref        text,   -- Bill.VendorRef.value
  vendor_name       text,   -- Bill.VendorRef.name
  txn_date          text,   -- Bill.TxnDate
  due_date          text,   -- Bill.DueDate
  total_amount      text,   -- Bill.TotalAmt
  balance           text,   -- Bill.Balance (open A/P)
  currency          text,   -- Bill.CurrencyRef.value
  last_updated_time text,   -- Bill.MetaData.LastUpdatedTime (incremental pull cursor)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE qbo_bills IS
  'Bronze: QuickBooks Online Bills (A/P) as a lossless envelope (LP #197). Read-only. external_id = QBO Bill Id. NOTE: A/P is feature-limited on the Simple Start subscription (cf. 0092/ADR-0085) — this lands whatever the API returns; raw_payload is lossless.';

-- ── QBO chart of accounts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qbo_accounts (
  account_id        text,   -- Account.Id
  name              text,   -- Account.Name
  fully_qualified_name text, -- Account.FullyQualifiedName (sub-account path)
  account_type      text,   -- Account.AccountType (Income | Expense | Bank | ...)
  account_sub_type  text,   -- Account.AccountSubType
  classification    text,   -- Account.Classification (Asset | Liability | Revenue | Expense | Equity)
  active            text,   -- Account.Active
  current_balance   text,   -- Account.CurrentBalance
  currency          text,   -- Account.CurrencyRef.value
  last_updated_time text,   -- Account.MetaData.LastUpdatedTime (incremental pull cursor)
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE qbo_accounts IS
  'Bronze: QuickBooks Online chart of accounts as a lossless envelope (LP #197). Read-only. external_id = account_id. The CFO expense-account mapping that recon/silver filter on (cf. 0092) resolves against this account list; raw_payload is lossless.';

-- ── QBO Profit & Loss report snapshot (report, not a transaction entity) ──────────────
CREATE TABLE IF NOT EXISTS qbo_profit_and_loss (
  report_name       text,   -- Report.Header.ReportName ('ProfitAndLoss')
  period_start      text,   -- Report.Header.StartPeriod
  period_end        text,   -- Report.Header.EndPeriod
  accounting_method text,   -- Report.Header.ReportBasis (Accrual | Cash)
  summarize_by      text,   -- Report.Header.SummarizeColumnsBy (Month | Quarter | Total)
  currency          text,   -- Report.Header.Currency
  generated_at      text,   -- Report.Header.Time
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE qbo_profit_and_loss IS
  'Bronze: QuickBooks Online Profit & Loss REPORT snapshot as a lossless envelope (LP #197). Read-only. external_id = a deterministic period+basis snapshot key (LP-minted); the full report Rows tree (line items, totals) is lossless in raw_payload — curated columns are the report header only.';

-- ════════════════════════════════════════════════════════════════════════════════════
--  Logistics (LP #198) — procurement orders + shipment/tracking + spend lines
-- ════════════════════════════════════════════════════════════════════════════════════

-- ── Amazon Business orders ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS amazon_business_orders (
  order_id          text,   -- Amazon Business order id
  order_date        text,
  order_status      text,   -- Pending | Shipped | Delivered | Cancelled
  order_total       text,   -- spend (backend casts)
  currency          text,
  buyer_name        text,   -- the purchasing user/account
  tracking_number   text,   -- shipment tracking (lossless full carrier detail in raw_payload)
  carrier           text,
  ship_status       text,
  estimated_delivery text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE amazon_business_orders IS
  'Bronze: Amazon Business orders + shipment/tracking + spend as a lossless envelope (LP #198). external_id = order_id; per-line procurement detail (items, qty, unit price) is lossless in raw_payload.';

-- ── CDW orders ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cdw_orders (
  order_id          text,   -- CDW order number
  po_number         text,   -- purchase-order reference
  order_date        text,
  order_status      text,
  order_total       text,   -- spend (backend casts)
  currency          text,
  account_ref       text,   -- CDW account the order belongs to
  tracking_number   text,   -- shipment tracking (lossless full carrier detail in raw_payload)
  carrier           text,
  ship_status       text,
  estimated_delivery text,
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE cdw_orders IS
  'Bronze: CDW procurement orders + shipment/tracking + spend lines as a lossless envelope (LP #198). external_id = order_id; per-line procurement detail (SKUs, qty, unit price) is lossless in raw_payload.';

-- ════════════════════════════════════════════════════════════════════════════════════
--  Interaction (LP #199) — scoped Derek/Mark↔clients capture (allowlist applied LP-side)
-- ════════════════════════════════════════════════════════════════════════════════════

-- ── M365 email (scoped) ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS m365_email (
  message_id        text,   -- Graph message id
  conversation_id   text,   -- Graph conversationId (thread grouping)
  subject           text,
  preview           text,   -- short body preview only (full body lossless in raw_payload)
  from_address      text,
  to_recipients     text,   -- flat participant projection; full structured list in raw_payload
  direction         text,   -- inbound | outbound
  sent_at           text,
  has_attachments   text,
  mailbox_owner     text,   -- the captured mailbox (Derek/Mark) — allowlist scoped LP-side
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE m365_email IS
  'Bronze: scoped M365 email capture (Derek/Mark↔clients) as a lossless envelope (LP #199). The participant allowlist filter is applied LP-side at collection, NOT in this schema. external_id = message_id; conversation_id threads. Only a short preview is curated; the full body + structured recipients are lossless in raw_payload.';

-- ── M365 Teams (scoped) ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS m365_teams (
  message_id        text,   -- Graph chatMessage id
  conversation_id   text,   -- chat/channel/thread id
  preview           text,   -- short content preview only (full content lossless in raw_payload)
  from_user         text,
  participants      text,   -- flat participant projection; full list in raw_payload
  direction         text,   -- inbound | outbound
  message_type      text,   -- chat | channel
  sent_at           text,
  has_attachments   text,
  captured_user     text,   -- the captured user (Derek/Mark) — allowlist scoped LP-side
  tenant_id text NOT NULL, source text NOT NULL, external_id text NOT NULL,
  collected_at text NOT NULL, raw_payload jsonb NOT NULL, content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE m365_teams IS
  'Bronze: scoped M365 Teams capture (Derek/Mark↔clients) as a lossless envelope (LP #199). The participant allowlist filter is applied LP-side at collection, NOT in this schema. external_id = message_id; conversation_id threads. Only a short preview is curated; the full content + structured participants are lossless in raw_payload.';

-- ════════════════════════════════════════════════════════════════════════════════════
--  Grants (0119/0083 defensive pattern; roles may be absent in some envs)
-- ════════════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  all_tables text[] := ARRAY[
    'qbo_invoices','qbo_payments','qbo_customers','qbo_estimates','qbo_bills',
    'qbo_accounts','qbo_profit_and_loss',
    'amazon_business_orders','cdw_orders',
    'm365_email','m365_teams'];
  t text;
BEGIN
  -- Local-pipeline writes ALL of this bronze (it runs the LP #197/#198/#199 collectors).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    FOREACH t IN ARRAY all_tables LOOP
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO "imperion-localpipeline"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role imperion-localpipeline absent — skipping LP grants.'; END IF;

  -- Web reads for display (BI hub / finance + logistics sections).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    FOREACH t IN ARRAY all_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrm-web-prd"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.'; END IF;

  -- Backend reads (reconciliation / orchestrator / agent picture).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    FOREACH t IN ARRAY all_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmbackendfunction"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.'; END IF;

  -- Cloud-pipeline reads (bronze→silver merge consumes the bronze).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    FOREACH t IN ARRAY all_tables LOOP
      EXECUTE format('GRANT SELECT ON %I TO "mgid-imperioncrmpipeline"', t);
    END LOOP;
  ELSE RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.'; END IF;
END $$;

COMMIT;
