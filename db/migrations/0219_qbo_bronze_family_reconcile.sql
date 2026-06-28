-- 0219: reconcile the QBO bronze family with the LP collectors' -ColumnSet. Closes #1496.
-- Migration number 0219 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — the
-- rebased branch takes the next free number and renames the file.
--
-- WHY THIS EXISTS. The LP W13 collector schema-drift audit (LP #401) diffed every QBO bronze
-- collector's `-ColumnSet` against the migrated live tables and found columns the collectors
-- PROJECT that the tables LACK. `Invoke-ImperionBronzeUpsert` is fail-loud (ADR-0005): the first
-- time QBO fires it will hard-error on the missing columns. QBO is currently DARK (gated on the
-- QBO app registration, BE #385), so this is LATENT — reconcile while dark, before it fails in
-- prod. Schema is front-end-owned (ADR-0042/§1); LP proposed this via #1496. Same drift class as
-- the prior fix-forward reconciles LP #219 / mig 0136 and LP #252 / mig 0148.
--
-- WHAT THIS DOES (all additive, idempotent, transactional; no DROP, no data loss; the tables are
-- empty in prod — QBO dark — but this is written to be safe even if they were not):
--   1. Adds `created_time` to the five transaction/account tables that inconsistently omit it
--      (`qbo_customers` already has it). The collectors already capture QBO MetaData.CreateTime,
--      so the fix is to ADD the column everywhere, not trim the collector.
--   2. Adds `qbo_bills.ap_account_ref` (Bill.APAccountRef.value) + `qbo_customers.primary_email` /
--      `primary_phone` (PrimaryEmailAddr / PrimaryPhone) — all all-text, the bronze convention.
--   3. Brings the legacy `qbo_expense_account` (0088, pre-dates the 0120 per-source envelope) up to
--      the standard bronze envelope ADDITIVELY so the uniform collector can write it. The legacy
--      shape (`id` uuid PK, `qbo_account_id` UNIQUE = the FK target `expense_category` links to,
--      `name`/`account_type`/… that the app READS, `raw`/`synced_at`/`created_at`) is PRESERVED
--      untouched — only the envelope columns + an upsert conflict key are added. The app never
--      writes this table (read-only sync, 0088 grant); only the LP QBO pull writes it.
--
-- WHAT THIS DELIBERATELY DOES NOT DO — `qbo_profit_and_loss`. The collector projects pre-computed
-- totals (total_income/total_expenses/net_income + start_date/end_date/period). Migration 0120
-- designed this table on purpose as a HEADER-ONLY snapshot (report_name, period_start, period_end,
-- accounting_method, summarize_by, currency, generated_at) with the full report Rows tree —
-- including every total — LOSSLESS in `raw_payload`; the silver merge curates totals out of the
-- payload (bronze = lossless envelope, ADR-0005/0039). Adding flat total columns to bronze would
-- violate that doctrine and duplicate `raw_payload`. RESOLUTION (recorded on LP #401): LP retargets
-- the P&L collector's `-ColumnSet` to the header shape (period_start/period_end/generated_at, drop
-- the totals + the start_date/end_date/period/report_period aliases) — no schema change here.
--
-- Refs: #1496, LP #401, BE #385 (QBO app reg, gating). Precedent: 0120 (qbo envelope family),
-- 0088 (qbo_expense_account origin + expense_category FK), 0136 / 0148 (prior drift reconciles).
-- No secrets, no PII inlined (the QBO token lives in Key Vault, referenced by name only). New
-- columns inherit the existing table grants (0120/0088) — no re-grant needed.

BEGIN;

-- ── 1+2. Column-level drift: ADD the missing all-text bronze columns ──────────────────────────
ALTER TABLE qbo_accounts  ADD COLUMN IF NOT EXISTS created_time     text;  -- Account.MetaData.CreateTime
ALTER TABLE qbo_estimates ADD COLUMN IF NOT EXISTS created_time     text;  -- Estimate.MetaData.CreateTime
ALTER TABLE qbo_invoices  ADD COLUMN IF NOT EXISTS created_time     text;  -- Invoice.MetaData.CreateTime
ALTER TABLE qbo_payments  ADD COLUMN IF NOT EXISTS created_time     text;  -- Payment.MetaData.CreateTime
ALTER TABLE qbo_bills     ADD COLUMN IF NOT EXISTS created_time     text;  -- Bill.MetaData.CreateTime
ALTER TABLE qbo_bills     ADD COLUMN IF NOT EXISTS ap_account_ref   text;  -- Bill.APAccountRef.value
ALTER TABLE qbo_customers ADD COLUMN IF NOT EXISTS primary_email    text;  -- Customer.PrimaryEmailAddr.Address
ALTER TABLE qbo_customers ADD COLUMN IF NOT EXISTS primary_phone    text;  -- Customer.PrimaryPhone.FreeFormNumber

-- ── 3. qbo_expense_account: additive envelope so the uniform LP collector can write it ─────────
-- The 0088 table is bronze but pre-dates the 0120 per-source envelope. Add the envelope columns
-- the collector's -ColumnSet requires; keep the legacy id/qbo_account_id/business columns + the
-- expense_category FK intact. NOT NULL on the envelope core matches the 0120 family and is safe —
-- the table is empty (QBO dark) and the app never writes it.
ALTER TABLE qbo_expense_account ADD COLUMN IF NOT EXISTS tenant_id         text NOT NULL DEFAULT '';
ALTER TABLE qbo_expense_account ADD COLUMN IF NOT EXISTS source            text NOT NULL DEFAULT '';
ALTER TABLE qbo_expense_account ADD COLUMN IF NOT EXISTS external_id       text NOT NULL DEFAULT '';
ALTER TABLE qbo_expense_account ADD COLUMN IF NOT EXISTS collected_at      text NOT NULL DEFAULT '';
ALTER TABLE qbo_expense_account ADD COLUMN IF NOT EXISTS raw_payload       jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE qbo_expense_account ADD COLUMN IF NOT EXISTS content_hash      text NOT NULL DEFAULT '';
ALTER TABLE qbo_expense_account ADD COLUMN IF NOT EXISTS classification    text;  -- Account.Classification
ALTER TABLE qbo_expense_account ADD COLUMN IF NOT EXISTS created_time      text;  -- Account.MetaData.CreateTime
ALTER TABLE qbo_expense_account ADD COLUMN IF NOT EXISTS last_updated_time text;  -- Account.MetaData.LastUpdatedTime
-- Drop the empty-string placeholder defaults: they exist only so ADD COLUMN NOT NULL is safe on a
-- (hypothetically) non-empty table; the collector always supplies real values on every upsert.
ALTER TABLE qbo_expense_account ALTER COLUMN tenant_id    DROP DEFAULT;
ALTER TABLE qbo_expense_account ALTER COLUMN source       DROP DEFAULT;
ALTER TABLE qbo_expense_account ALTER COLUMN external_id  DROP DEFAULT;
ALTER TABLE qbo_expense_account ALTER COLUMN collected_at DROP DEFAULT;
ALTER TABLE qbo_expense_account ALTER COLUMN raw_payload  DROP DEFAULT;
ALTER TABLE qbo_expense_account ALTER COLUMN content_hash DROP DEFAULT;

-- Upsert conflict target — the 0120 family keys on (tenant_id, source, external_id); provide the
-- same key here so `Invoke-ImperionBronzeUpsert`'s ON CONFLICT resolves. The legacy `id` stays the
-- PK and `qbo_account_id` stays the UNIQUE FK target — this is an additional unique, not a swap.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qbo_expense_account_envelope_key'
  ) THEN
    ALTER TABLE qbo_expense_account
      ADD CONSTRAINT qbo_expense_account_envelope_key UNIQUE (tenant_id, source, external_id);
  END IF;
END $$;

COMMENT ON TABLE qbo_expense_account IS
  'Bronze (ADR-0039): QuickBooks chart-of-accounts synced read-only — the Expense Category system of record (ADR-0083). Populated by the local-pipeline QuickBooks bulk pull (standard envelope since 0219/#1496); the app NEVER writes QuickBooks. external_id = qbo_account_id (QBO Account.Id); mapped to a clean expense_category by an admin.';

COMMIT;
