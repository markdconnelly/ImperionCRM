-- 0121: silver `invoice` read-only MIRROR over bronze `qbo_invoices` (#668, epic #667).
-- (0120 was the latest applied/repo migration; 0121 claimed at merge per §10.3. If another
-- migration merges ahead of this during the CI window, rename this file — rename is data-safe
-- — and fix the in-file refs + data-model.md + the invoice OKF concept timestamp.)
--
-- THE OWN-vs-MIRROR DECISION (RESOLVED — MIRROR, #668): there is no app-side AR object and
-- no write path to QuickBooks. QBO is the system of record for invoices and is READ-ONLY on
-- our side (ADR-0085 QBO read-only posture; ADR-0044 external-SoR mirror discipline). The Collections / AR-
-- dunning and Controller / reconciliation-assurance agents (#667) DETECT / DRAFT / ESCALATE
-- against this mirror — they NEVER move money. So the AR surface is a thin observability
-- projection, exactly like `ticket_sla_breach` (mig 0118) is for service desk.
--
-- WHY A VIEW (not a table): a mirror needs no stored state and no separate refresh job — a
-- plain VIEW recomputes aging on every read against the latest bronze `qbo_invoices` (mig
-- 0120, LP #197 pull). The pipeline's normal QBO pull IS the refresh; no bronze→silver merge
-- job is required, so the whole mirror is self-contained in this one front-end PR.
--
-- WHAT THIS IS NOT:
--   * NOT a table. No new SoR, no stored AR state, no payment-match write-back, no app→QBO write.
--   * NOT a second invoice shape. It is a thin projection that type-casts the all-text bronze
--     envelope (mig 0120) and adds derived aging columns (days_overdue, aging_bucket, is_open).
--   * NOT a payment ledger. qbo_payments (mig 0120) match/apply is a future Pipeline/Backend
--     concern; balance>0 from the invoice envelope is the open-AR signal this surface needs.
--
-- ACCOUNT LINK (observability, best-effort): bronze qbo_invoices.customer_ref → bronze
-- qbo_customers.customer_id is the firm join. The QBO customer → silver `account` link is
-- established LP-side (mig 0120 comment) but no FK column exists on `account` yet, so this
-- mirror resolves the silver account by a case-insensitive name match (customer display/company
-- name → account.name) as a LEFT JOIN. A miss leaves account_id NULL and keeps the QBO customer
-- name — the mirror is never blocked on a resolved account (observability-only). A typed
-- account↔QBO-customer mapping is a follow-up (filed as a sibling Pipeline issue; see PR body).
--
-- Read-only VIEW. Frontend-owned schema (ADR-0042). Idempotent (CREATE OR REPLACE).
-- No new table, no SoR, no secrets, no row-level PII inlined (no email/address selected;
-- customer NAME + doc number are business identifiers the AR surface needs, not personal PII).

CREATE OR REPLACE VIEW invoice_mirror AS
  WITH inv AS (
    -- Type-cast the all-text bronze envelope (mig 0120). Bad/blank values cast to NULL via a
    -- guarded NULLIF so one malformed row never breaks the whole projection.
    SELECT
      i.tenant_id,
      i.source,
      i.external_id,
      i.doc_number,
      i.customer_ref,
      i.customer_name,
      i.currency,
      i.email_status,
      NULLIF(i.txn_date, '')::date                                   AS txn_date,
      NULLIF(i.due_date, '')::date                                   AS due_date,
      NULLIF(regexp_replace(i.total_amount, '[^0-9.\-]', '', 'g'), '')::numeric(14,2) AS total_amount,
      NULLIF(regexp_replace(i.balance,      '[^0-9.\-]', '', 'g'), '')::numeric(14,2) AS balance,
      NULLIF(i.last_updated_time, '')                               AS last_updated_time
    FROM qbo_invoices i
  )
  SELECT
    inv.tenant_id,
    inv.external_id                                  AS qbo_invoice_id,   -- QBO Invoice Id (stable key)
    inv.doc_number,
    inv.customer_ref                                 AS qbo_customer_id,  -- joins qbo_customers.customer_id
    inv.customer_name                                AS qbo_customer_name,
    -- Best-effort silver account resolution (LEFT JOIN; NULL on a miss — never blocks the row).
    a.id                                             AS account_id,
    a.name                                           AS account_name,
    inv.txn_date,
    inv.due_date,
    inv.total_amount,
    inv.balance,
    inv.currency,
    inv.email_status,
    inv.last_updated_time,
    -- ── Derived AR signals (recomputed every read) ──────────────────────────────────────
    -- Open = QBO still shows an outstanding balance. The single source-of-truth open flag.
    (COALESCE(inv.balance, 0) > 0)                   AS is_open,
    -- Days overdue: whole days past the due date, only while open and past due (else NULL).
    -- A not-yet-due open invoice and any settled invoice both report NULL (not "0 overdue").
    CASE
      WHEN inv.due_date IS NULL THEN NULL
      WHEN COALESCE(inv.balance, 0) <= 0 THEN NULL
      WHEN (CURRENT_DATE - inv.due_date) <= 0 THEN NULL
      ELSE (CURRENT_DATE - inv.due_date)
    END                                              AS days_overdue,
    -- Aging bucket: the collections worklist partition. `current` = open but not past due;
    -- `paid` = settled (balance<=0); the 1-30/31-60/61-90/90+ tiers are open & overdue.
    CASE
      WHEN COALESCE(inv.balance, 0) <= 0 THEN 'paid'
      WHEN inv.due_date IS NULL THEN 'current'
      WHEN (CURRENT_DATE - inv.due_date) <= 0 THEN 'current'
      WHEN (CURRENT_DATE - inv.due_date) <= 30 THEN '1-30'
      WHEN (CURRENT_DATE - inv.due_date) <= 60 THEN '31-60'
      WHEN (CURRENT_DATE - inv.due_date) <= 90 THEN '61-90'
      ELSE '90+'
    END                                              AS aging_bucket
  FROM inv
  LEFT JOIN account a
         ON a.archived_at IS NULL
        AND lower(a.name) = lower(COALESCE(NULLIF(inv.customer_name, ''), '\x00'));

COMMENT ON VIEW invoice_mirror IS
  'Read-only AR/invoice MIRROR over bronze qbo_invoices (#668, ADR-0085 QBO read-only / ADR-0044 external-SoR mirror). NOT an app-side AR store and NO write path to QBO — the Collections + Controller agents (#667) detect/draft/escalate, never move money. A plain VIEW: aging (days_overdue, aging_bucket current|1-30|31-60|61-90|90+|paid, is_open from balance>0) recomputed on every read against the latest pulled bronze, so the pipeline''s QBO pull is its refresh. Amounts/dates cast from the all-text bronze envelope (mig 0120); silver account resolved best-effort by case-insensitive name (LEFT JOIN, NULL on a miss). No new table, no SoR, no PII (no email/address selected).';

-- ── Grants: the app reads the mirror (collections worklist / AR observability surface);
--    backend reads it for the Collections + Controller agents (#667); pipeline reads it on
--    refresh (it owns the underlying QBO pull). Defensive (roles may be absent), mirroring 0118/0120.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON invoice_mirror TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON invoice_mirror TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON invoice_mirror TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grant.';
  END IF;
END $$;
