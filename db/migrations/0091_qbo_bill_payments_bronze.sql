-- 0091: QuickBooks Online vendor bill-payments bronze — the time-tracking PAYMENT FACT
-- (#519, ADR-0082, epic #458; LP collector #170/PR #173, LP ADR-0014).
--
-- The on-prem local pipeline bulk-pulls the MSP's own accounts-payable vendor payments
-- from QuickBooks Online into this bronze table. It is the AUTHORITATIVE payment fact the
-- backend Payroll Reconciliation (ImperionCRM_Backend #105 / recon#2) matches against
-- expected pay (approved hours × effective Pay Rate) to move a timesheet to **Paid**.
--
-- READ-ONLY: QBO is authoritative for the payment fact ALONE — the app never pays
-- (ADR-0082). v1 = all 1099 (employees paid hourly direct as QBO vendors → exact amount
-- match); W2 is modeled-dormant.
--
-- CONVENTION: LP lossless-envelope bronze (same shape as 0083 opportunity / 0038 kqm):
-- flat text columns for the readable subset, true types preserved in `raw_payload`,
-- conflict key (tenant_id, source, external_id) where external_id = the QBO BillPayment Id.
-- Field names/casing are modeled from the documented Intuit Accounting API v3 and are
-- UNVERIFIED against the real company until Mark's QBO read-only app registration lands —
-- `raw_payload` is lossless, so any field-name drift is recoverable without a migration.
--
-- NOT comp data: `total_amount` is the payment fact, never logged; `pay_rate` stays in the
-- finance-gated 0085 store. Additive, idempotent, transactional. No secrets.

BEGIN;

-- ── qbo_bill_payments (bronze — the payment fact) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS qbo_bill_payments (
  txn_date          text,   -- BillPayment.TxnDate
  total_amount      text,   -- BillPayment.TotalAmt — the payment fact (backend casts; never logged)
  vendor_id         text,   -- BillPayment.VendorRef.value (the 1099 contractor → employee via QB vendor mapping, 0085)
  vendor_name       text,   -- BillPayment.VendorRef.name
  pay_type          text,   -- BillPayment.PayType (Check | CreditCard)
  doc_number        text,   -- BillPayment.DocNumber
  currency          text,   -- BillPayment.CurrencyRef.value
  created_time      text,   -- BillPayment.MetaData.CreateTime
  last_updated_time text,   -- BillPayment.MetaData.LastUpdatedTime (incremental pull cursor)
  tenant_id   text  NOT NULL,           -- partner tenant (QBO is the MSP's own books, like KQM)
  source      text  NOT NULL,           -- 'qbo'
  external_id text  NOT NULL,           -- QBO BillPayment Id (stable, realm-scoped) → idempotent upsert
  collected_at text NOT NULL,
  raw_payload jsonb NOT NULL,           -- lossless original BillPayment payload (ADR-0039)
  content_hash text NOT NULL,
  PRIMARY KEY (tenant_id, source, external_id)
);
COMMENT ON TABLE qbo_bill_payments IS
  'QuickBooks Online vendor bill-payments as bronze — the authoritative payment fact for time-tracking (ADR-0082, #519). Read-only; the app never pays. external_id = QBO BillPayment Id. Written by the local pipeline (#170); read by backend Payroll Reconciliation (#105) to set a timesheet Paid. total_amount is never logged; not comp data.';

-- Reconciliation lookup: match a vendor payment near the pay period.
CREATE INDEX IF NOT EXISTS idx_qbo_bill_payments_vendor_date
  ON qbo_bill_payments (vendor_id, txn_date);

-- ── Grants (0086/0083 defensive pattern; roles may be absent in some envs) ────────────
DO $$
BEGIN
  -- Local-pipeline WRITES this bronze (the scheduled QBO bill-payment bulk pull, #170).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON qbo_bill_payments TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grant.';
  END IF;

  -- Backend READS it: Payroll Reconciliation (#105) is the sole consumer (matches to set Paid).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON qbo_bill_payments TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
END $$;

COMMIT;
