-- 0090: Expense Autotask write-tracking + policy violations + reimbursement
-- reconciliation + the unified monthly-close read-model. (ADR-0083, issue #485.)
-- Depends on 0089. Third and last of the three expense schema migrations
-- (0088 config/comp → 0089 capture/silver → 0090 autotask-write/recon).
--
-- Four pieces (ADR-0083 §Autotask write, §Policy engine, §Reimbursement
-- Reconciliation, §Unified Monthly Close):
--   1. autotask_expense_report — tracks the ONE idempotent Autotask ExpenseReport
--      Imperion writes per employee per month (one per expense_report). Backend
--      ADR-0044 idempotency pattern (mirrors time_ticket, 0087): a stable
--      idempotency_key + write_state + the stored external_ref, so re-approval
--      UPDATES the same report rather than creating a duplicate; attachment_verified
--      records the verify-stored read-back of pushed receipts.
--   2. expense_policy_violation — the per-item violation read model, DERIVED as a view
--      over expense_item + expense_category caps + the expense_policy rule set (0088).
--      Surfaced pre-attest as the memory-jogger; hard rows block attest. The one
--      row-pair rule (suspected_duplicate) is detected by the app/backend on top of
--      this base — exactly as time's six Deviations layer on the reconciliation view.
--   3. expense_reconciliation — Reimbursement Reconciliation: the backend-written
--      verdict matching an approved report's reimbursable total against the
--      authoritative QuickBooks bill-payment (read-only). verdict matched|mismatch|
--      pending; a mismatch blocks auto-reimbursed (a human resolves). Tolerance is a
--      stored, configurable column.
--   4. monthly_close — the unified time+expense read-model (AMENDS ADR-0082): per
--      employee per month, rolled-up approved time minutes + reimbursable expense
--      total, both QuickBooks match statuses, and open obligations. Comp-FREE and
--      role-gated like the time reconciliation views — expected pay (hours × rate)
--      stays in the backend (the sole reader of pay_rate / mileage_rate, 0085/0088).
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it (issue #494). No secrets, no comp data.

BEGIN;

-- ── autotask_expense_report: the idempotent monthly Autotask ExpenseReport tracker ─
-- 1:1 with the expense_report (one Autotask ExpenseReport per employee per month).
-- Idempotency is OURS (creates are non-idempotent): the stable idempotency_key +
-- write_state let the backend executor check before every write; external_ref is the
-- Autotask ExpenseReport id, so re-approval updates the same report.
CREATE TABLE IF NOT EXISTS autotask_expense_report (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_report_id uuid NOT NULL UNIQUE REFERENCES expense_report(id) ON DELETE CASCADE,
  app_user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,   -- the Employee (denormalized)
  period_year     integer NOT NULL,
  period_month    integer NOT NULL,
  external_ref    bigint,                              -- Autotask ExpenseReport id; NULL until written
  write_state     text NOT NULL DEFAULT 'pending'
                    CHECK (write_state IN ('pending','writing','written','failed')),
  idempotency_key text NOT NULL UNIQUE,                -- stable: imperioncrm-expensereport-{expense_report_id}
  attachment_verified boolean NOT NULL DEFAULT false,  -- all pushed receipts read-back verified in Autotask
  last_pushed_at  timestamptz,
  written_at      timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE autotask_expense_report IS
  'Write-tracking for the ONE idempotent Autotask ExpenseReport per employee per month (ADR-0083, backend ADR-0044). One per expense_report; stable idempotency_key + write_state + stored external_ref → re-approval updates the same report, never a duplicate. attachment_verified records the verify-stored read-back of pushed receipts.';

-- The executor's work queue: approved reports awaiting / mid write.
CREATE INDEX IF NOT EXISTS idx_autotask_expense_report_pending ON autotask_expense_report (write_state)
  WHERE write_state IN ('pending','writing','failed');
CREATE INDEX IF NOT EXISTS idx_autotask_expense_report_employee_period
  ON autotask_expense_report (app_user_id, period_year DESC, period_month DESC);

DROP TRIGGER IF EXISTS trg_autotask_expense_report_updated ON autotask_expense_report;
CREATE TRIGGER trg_autotask_expense_report_updated BEFORE UPDATE ON autotask_expense_report
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── expense_policy_violation: the derived per-item violation read model ─────────
-- Evaluated pre-attest, surfaced as the memory-jogger (ADR-0083 §Policy engine).
-- DERIVED over expense_item + the per-category caps (0088 expense_category) + the
-- active expense_policy rule set; hard rows block attest. Each deterministic rule is
-- a SELECT with a rule_key + severity literal, UNION'd. The one row-pair rule —
-- suspected_duplicate (merchant+amount+date) — is detected by the app/backend on top
-- of this base (it needs row-pair logic beyond a per-item view), mirroring how time's
-- six Deviations layer on time_reconciliation_day (0087). A rule only fires when it is
-- active in expense_policy, so admins can disable a rule in-app (0088).
CREATE OR REPLACE VIEW expense_policy_violation AS
  -- missing_receipt (hard): an out-of-pocket item with no receipt (mileage exempt).
  SELECT ei.id AS expense_item_id, ei.expense_report_id, 'missing_receipt'::text AS rule_key,
         'hard'::text AS severity,
         'Out-of-pocket item has no receipt'::text AS detail
    FROM expense_item ei
   WHERE ei.kind = 'out_of_pocket' AND ei.receipt_id IS NULL
     AND EXISTS (SELECT 1 FROM expense_policy p WHERE p.rule_key = 'missing_receipt' AND p.is_active)
  UNION ALL
  -- over_category_cap (hard): amount over the category hard cap.
  SELECT ei.id, ei.expense_report_id, 'over_category_cap', 'hard',
         'Amount exceeds the category hard cap'
    FROM expense_item ei
    JOIN expense_category c ON c.id = ei.category_id
   WHERE c.hard_cap IS NOT NULL AND ei.amount IS NOT NULL AND ei.amount > c.hard_cap
     AND EXISTS (SELECT 1 FROM expense_policy p WHERE p.rule_key = 'over_category_cap' AND p.is_active)
  UNION ALL
  -- future_dated (hard): item dated in the future.
  SELECT ei.id, ei.expense_report_id, 'future_dated', 'hard',
         'Item is dated in the future'
    FROM expense_item ei
   WHERE ei.item_date > CURRENT_DATE
     AND EXISTS (SELECT 1 FROM expense_policy p WHERE p.rule_key = 'future_dated' AND p.is_active)
  UNION ALL
  -- dated_outside_month (hard): item date not in the report's period month.
  SELECT ei.id, ei.expense_report_id, 'dated_outside_month', 'hard',
         'Item is dated outside the report month'
    FROM expense_item ei
    JOIN expense_report er ON er.id = ei.expense_report_id
   WHERE (EXTRACT(YEAR FROM ei.item_date)::int <> er.period_year
          OR EXTRACT(MONTH FROM ei.item_date)::int <> er.period_month)
     AND EXISTS (SELECT 1 FROM expense_policy p WHERE p.rule_key = 'dated_outside_month' AND p.is_active)
  UNION ALL
  -- over_soft_threshold (soft): amount over the category soft threshold.
  SELECT ei.id, ei.expense_report_id, 'over_soft_threshold', 'soft',
         'Amount exceeds the category soft threshold'
    FROM expense_item ei
    JOIN expense_category c ON c.id = ei.category_id
   WHERE c.soft_threshold IS NOT NULL AND ei.amount IS NOT NULL AND ei.amount > c.soft_threshold
     AND EXISTS (SELECT 1 FROM expense_policy p WHERE p.rule_key = 'over_soft_threshold' AND p.is_active)
  UNION ALL
  -- billable_missing_company (soft): a billable item with no client link.
  SELECT ei.id, ei.expense_report_id, 'billable_missing_company', 'soft',
         'Billable item is missing a client (companyID)'
    FROM expense_item ei
   WHERE ei.billable AND ei.autotask_company_id IS NULL
     AND EXISTS (SELECT 1 FROM expense_policy p WHERE p.rule_key = 'billable_missing_company' AND p.is_active)
  UNION ALL
  -- uncategorized (soft): no category, or the catch-all "Other".
  SELECT ei.id, ei.expense_report_id, 'uncategorized', 'soft',
         'Item is uncategorized or "Other"'
    FROM expense_item ei
    LEFT JOIN expense_category c ON c.id = ei.category_id
   WHERE (ei.category_id IS NULL OR c.key = 'other')
     AND EXISTS (SELECT 1 FROM expense_policy p WHERE p.rule_key = 'uncategorized' AND p.is_active);
COMMENT ON VIEW expense_policy_violation IS
  'Derived per-item Expense Policy violations (ADR-0083), surfaced pre-attest as the memory-jogger; hard rows block attest. Over expense_item + expense_category caps + the active expense_policy rules (0088). The row-pair rule suspected_duplicate is detected by the app/backend on top of this base (like time''s six Deviations on 0087). No comp data.';

-- ── expense_reconciliation: Reimbursement Reconciliation verdict (backend-written) ─
-- Expected = the approved report's reimbursable total; lined up against the
-- authoritative QuickBooks bill-payment (read-only). The match (employee + period +
-- amount within tolerance) sets the report reimbursed; a mismatch/partial is an
-- exception that blocks auto-reimbursed until a human resolves (surfaced in the close).
-- Backend-written (the QuickBooks reader); one row per report.
CREATE TABLE IF NOT EXISTS expense_reconciliation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_report_id uuid NOT NULL UNIQUE REFERENCES expense_report(id) ON DELETE CASCADE,
  expected_reimbursable_total numeric(12,2),           -- snapshot of the approved reimbursable total
  qb_bill_payment_ref text,                            -- matched QuickBooks bill-payment id (read-only SoR)
  qb_payment_amount numeric(12,2),                     -- the authoritative paid amount
  tolerance       numeric(12,2) NOT NULL DEFAULT 0.01, -- configurable match tolerance (USD)
  verdict         text NOT NULL DEFAULT 'pending'
                    CHECK (verdict IN ('pending','matched','mismatch')),
  reconciled_at   timestamptz,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE expense_reconciliation IS
  'Reimbursement Reconciliation (ADR-0083): the backend-written verdict matching an approved report''s reimbursable total against the authoritative QuickBooks bill-payment (read-only). verdict matched sets reimbursed; mismatch blocks auto-reimbursed until a human resolves. tolerance is configurable. Books as a separate AP bill, distinct from the payroll wage.';
CREATE INDEX IF NOT EXISTS idx_expense_reconciliation_verdict ON expense_reconciliation (verdict);

DROP TRIGGER IF EXISTS trg_expense_reconciliation_updated ON expense_reconciliation;
CREATE TRIGGER trg_expense_reconciliation_updated BEFORE UPDATE ON expense_reconciliation
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── monthly_close: the unified time + expense read-model (AMENDS ADR-0082) ──────
-- The single monthly finance surface, per employee per month: rolled-up approved
-- time minutes (weekly timesheets rolled up by the month of their week_start) +
-- reimbursable expense total, both QuickBooks match statuses, and open obligations
-- (approved-but-not-yet-confirmed-paid). FULL OUTER JOIN so a month with only time
-- or only expense still appears. Comp-FREE (minutes + dollar amounts only; no rate) —
-- expected-pay math stays in the backend (the sole reader of the comp store).
CREATE OR REPLACE VIEW monthly_close AS
  WITH expense_month AS (
    SELECT er.app_user_id,
           er.period_year  AS period_year,
           er.period_month AS period_month,
           er.id           AS expense_report_id,
           er.state        AS expense_state,
           COALESCE(SUM(ei.amount) FILTER (WHERE ei.reimbursable), 0) AS reimbursable_total,
           rc.verdict      AS reimbursement_verdict,
           rc.qb_bill_payment_ref
      FROM expense_report er
      LEFT JOIN expense_item ei ON ei.expense_report_id = er.id
      LEFT JOIN expense_reconciliation rc ON rc.expense_report_id = er.id
     GROUP BY er.app_user_id, er.period_year, er.period_month, er.id, er.state,
              rc.verdict, rc.qb_bill_payment_ref
  ),
  time_month AS (
    SELECT t.app_user_id,
           EXTRACT(YEAR  FROM t.week_start)::int AS period_year,
           EXTRACT(MONTH FROM t.week_start)::int AS period_month,
           COUNT(*)                                 AS timesheet_count,
           COUNT(*) FILTER (WHERE t.state = 'paid') AS paid_count,
           COALESCE(SUM(ps.approved_minutes), 0)    AS approved_time_minutes
      FROM timesheet t
      LEFT JOIN timesheet_payroll_status ps ON ps.timesheet_id = t.id
     GROUP BY t.app_user_id, EXTRACT(YEAR FROM t.week_start), EXTRACT(MONTH FROM t.week_start)
  )
  SELECT
    COALESCE(e.app_user_id,  tm.app_user_id)  AS app_user_id,
    COALESCE(e.period_year,  tm.period_year)  AS period_year,
    COALESCE(e.period_month, tm.period_month) AS period_month,
    -- expense side
    e.expense_report_id,
    e.expense_state,
    COALESCE(e.reimbursable_total, 0)            AS reimbursable_total,
    COALESCE(e.reimbursement_verdict, 'pending') AS reimbursement_verdict,
    e.qb_bill_payment_ref,
    -- time side
    COALESCE(tm.approved_time_minutes, 0) AS approved_time_minutes,
    COALESCE(tm.timesheet_count, 0)       AS timesheet_count,
    COALESCE(tm.paid_count, 0)            AS paid_count,
    -- open obligations (approved/finance-approved but not yet confirmed paid)
    (e.expense_state = 'finance_approved')                              AS expense_obligation_open,
    (COALESCE(tm.timesheet_count, 0) > COALESCE(tm.paid_count, 0))      AS time_obligation_open
  FROM expense_month e
  FULL OUTER JOIN time_month tm
    ON tm.app_user_id  = e.app_user_id
   AND tm.period_year  = e.period_year
   AND tm.period_month = e.period_month;
COMMENT ON VIEW monthly_close IS
  'Unified monthly close read-model (ADR-0083, amends ADR-0082): per employee per month, rolled-up approved time minutes (timesheets by month of week_start) + reimbursable expense total, both QuickBooks match statuses, and open obligations. Comp-free + role-gated like the time recon views; expected pay (hours × rate) lives in the backend (sole reader of the comp store).';

-- ── Grants (0087 defensive pattern; roles may be absent in some envs) ──────────
-- autotask_expense_report: web requests (creates pending on approval) + renders;
--   backend writes (executor); pipeline reads to reconcile the written report back.
-- expense_policy_violation (view) + monthly_close (view): web + backend read (no comp).
-- expense_reconciliation (table): backend writes the verdict; web reads for the close.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE ON autotask_expense_report TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON expense_policy_violation TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON expense_reconciliation   TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON monthly_close            TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, UPDATE ON autotask_expense_report TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE ON expense_reconciliation TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON expense_policy_violation TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON monthly_close            TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON autotask_expense_report TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grant.';
  END IF;
END $$;

COMMIT;
