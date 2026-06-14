-- 0092: QuickBooks Online PURCHASES bronze — the time-tracking/expense PAYMENT FACT.
-- Supersedes 0091 (qbo_bill_payments). (#526, ADR-0085; amends ADR-0082/ADR-0083, epic #458/#482.)
--
-- WHY THE CHANGE: Imperion's QBO company is **Simple Start**, which has NO Accounts Payable —
-- the `Bill`/`BillPayment` entities 0091 modeled return "Feature Not Supported" from the API.
-- In Simple Start, 1099 contractor payments (and reimbursements) are recorded as Checks /
-- Expenses, exposed by the Intuit Accounting API as the **`Purchase`** entity. So the
-- authoritative payment fact re-targets `BillPayment` → `Purchase`. The subscription is NOT
-- being upgraded (ADR-0085). 0091's table was empty and never wired (no QBO creds), so the
-- swap is a clean drop + create.
--
-- WHAT READS IT: the backend Payroll Reconciliation (ImperionCRM_Backend #105 / recon#2,
-- ADR-0082) and the expense reimbursement reconciliation (ADR-0083) match expected pay/
-- reimbursement to a real `Purchase` to the employee's mapped QB payee. The payee link is the
-- existing `employee_profile.qb_vendor_id` (migration 0085) = `Purchase.EntityRef.value`,
-- reused unchanged.
--
-- READ-ONLY: QBO is authoritative for the payment fact ALONE — the app never pays. v1 = all
-- 1099 (gross = net → exact amount match); W2 modeled-dormant.
--
-- CFO MAPPING (config, not schema): which expense account(s) represent contractor-pay vs
-- reimbursable-expense are `Line[].AccountBasedExpenseLineDetail.AccountRef`, preserved
-- losslessly in `raw_payload`; recon/silver filters on them. No migration depends on that list.
--
-- CONVENTION: LP lossless-envelope bronze (same shape as 0091/0083/0038): flat text columns
-- for the readable subset, true types preserved in `raw_payload`, conflict key
-- (tenant_id, source, external_id) where external_id = the QBO `Purchase.Id`. Field
-- names/casing are modeled from the documented Intuit Accounting API v3 and are UNVERIFIED
-- against the real company / sandbox until Mark's QBO read-only app registration lands —
-- `raw_payload` is lossless, so any field-name drift is recoverable without a migration.
--
-- NOT comp data: `total_amount` is the payment fact, never logged; `pay_rate` stays in the
-- finance-gated 0085 store. Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── Drop the superseded BillPayment bronze (0091 — empty, never wired) ─────────────────
DROP TABLE IF EXISTS qbo_bill_payments;

-- ── qbo_purchases (bronze — the payment fact) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qbo_purchases (
  txn_date          text,   -- Purchase.TxnDate (payment date)
  total_amount      text,   -- Purchase.TotalAmt — the payment fact (backend casts; never logged)
  payment_type      text,   -- Purchase.PaymentType (Cash | Check | CreditCard)
  account_ref       text,   -- Purchase.AccountRef.value (bank/CC account the money left from)
  account_name      text,   -- Purchase.AccountRef.name
  entity_id         text,   -- Purchase.EntityRef.value (the payee → employee via qb_vendor_id, 0085)
  entity_type       text,   -- Purchase.EntityRef.type (Vendor for 1099 contractors)
  entity_name       text,   -- Purchase.EntityRef.name
  doc_number        text,   -- Purchase.DocNumber (e.g. check number)
  currency          text,   -- Purchase.CurrencyRef.value
  created_time      text,   -- Purchase.MetaData.CreateTime
  last_updated_time text,   -- Purchase.MetaData.LastUpdatedTime (incremental pull cursor)
  tenant_id   text  NOT NULL,           -- partner tenant (QBO is the MSP's own books, like KQM)
  source      text  NOT NULL,           -- 'qbo'
  external_id text  NOT NULL,           -- QBO Purchase Id (stable, realm-scoped) → idempotent upsert
  collected_at text NOT NULL,
  raw_payload jsonb NOT NULL,           -- lossless original Purchase payload incl. Line[] (ADR-0039)
  content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE qbo_purchases IS
  'QuickBooks Online Purchases (Check/Expense) as bronze — the authoritative payment fact for time-tracking + expense reimbursement on a Simple Start subscription (ADR-0085, supersedes 0091/qbo_bill_payments). Read-only; the app never pays. external_id = QBO Purchase Id. Written by the local pipeline (LP #174); read by backend reconciliation (#105 payroll, ADR-0083 reimbursement). Payee = EntityRef → employee_profile.qb_vendor_id (0085). total_amount is never logged; not comp data. CFO-designated expense accounts (Line[].AccountBasedExpenseLineDetail.AccountRef) live in raw_payload.';

-- Reconciliation lookup: match a payment to a payee near the pay/expense period.
CREATE INDEX IF NOT EXISTS idx_qbo_purchases_entity_date
  ON qbo_purchases (entity_id, txn_date);

-- ── Grants (0091/0086/0083 defensive pattern; roles may be absent in some envs) ────────
DO $$
BEGIN
  -- Local-pipeline WRITES this bronze (the scheduled QBO Purchase bulk pull, LP #174).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON qbo_purchases TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grant.';
  END IF;

  -- Backend READS it: payroll (#105) + expense reimbursement (ADR-0083) reconciliation.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON qbo_purchases TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
END $$;

COMMIT;
