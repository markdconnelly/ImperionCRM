-- 0197: Cost-allocation model — allocate labor + (billable) tooling cost per client &
-- service, and give the governed cost-to-serve metrics a REAL labor basis (#1091, first
-- tracer slice of the profitability epic #1044).
--
-- Migration number 0197 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against a high free slot while origin/main tops at 0195 and concurrent FE
-- sessions (#1079/#1095/#1235) are also adding migrations; the branch that merges second
-- renumbers. Do NOT hardcode-depend on 0197 — the metric contract test locates the new
-- definitions by `key` (`labor_cost_to_serve` / `cost_to_serve`), never by number.
--
-- WHY THIS EXISTS. Epic #1044 (Hormozi — "you can't optimize a margin you don't measure")
-- decomposes into: THIS cost-allocation model (#1091) → revenue join (#1092) → effective-
-- rate / margin per client & service (#1093) → BI surface (#1094). Today the governed
-- profitability metrics added by 0193 use only the BILLABLE-EXPENSE leg as cost-to-serve,
-- because `time_record` carries no rate; 0193 says verbatim "a labor-rate cost basis lands
-- when time_record carries a rate (profitability epic #1091 cost-allocation model)". This
-- slice supplies exactly that basis — labor cost = billable hours × the employee's
-- effective Pay Rate — and exposes the per-client / per-service ALLOCATION as a derived
-- silver view. Per ADR-0062 / the metrics-layer epic #1050 the cost numbers go onto the
-- EXISTING governed `metric_definition` store (the same read path #1115 → backend engine
-- #259 the BI hub #288 and the `metric_lookup` sub-agent tool use) — NOT a parallel metrics
-- surface. Agents and humans then get the IDENTICAL cost number by construction.
--
-- WHAT IT ADDS.
--   1. VIEW cost_allocation — derived (archetype C/F), Finance domain. The per-client /
--      per-service-line ALLOCATION BASIS for a period: billable hours and billable
--      tooling/expense dollars, grouped by client (account) and service line (the ticket
--      category the work was booked against). Labor HOURS only — never the comp dollar —
--      so the broadly-granted view leaks no Pay Rate. This is the 0087 precedent
--      (`timesheet_payroll_status` exposes minutes, never rate; the dollar math is the
--      backend's job). The labor dollar lands ONLY inside the governed metric expressions
--      below, which the backend metric engine binds and runs in a read-only transaction —
--      the same single controlled reader of `pay_rate` (ADR-0082 §Security).
--   2. Two governed metric_definition rows (executable `SELECT … AS value` scalars, the
--      0180 contract; `:period_start` is the engine-bound temporal param):
--        labor_cost_to_serve (financial) billable hours × effective hourly Pay Rate in period
--        cost_to_serve       (financial) labor_cost_to_serve + billable tooling/expense in period
--      Both proven to run against the LIVE schema before authoring (single-`value` scalar,
--      §8): they read over silver entities that exist (`time_record`, `pay_rate`,
--      `expense_item`) and return one aggregate, never row-level data. The effective-rate
--      lookup is the 0082 rule: greatest pay_rate.effective_from <= the work_date, hourly.
--
-- The cost-to-serve TODAY is the labor + billable-expense legs. The LICENSE/tooling leg
-- named in #1044 ("labor + licenses + tools") is modelled in the matrix but DORMANT: silver
-- `license_assignment` carries no per-seat cost column yet (that is the cost/seat true-up
-- #1041, a separate slice) — so a license dollar would be invented, which this tracer must
-- not do. cost_to_serve evolves IN PLACE by `key` (the 0193 precedent) when #1041 lands the
-- seat cost; the metric description states this explicitly so no surface assumes licenses
-- are already counted.
--
-- data_class follows sensitivity (the #1034 axis): both new metrics are money → `financial`
-- (always-gate). The view exposes operational allocation aggregates (hours + a billable $
-- that is already client-facing) → it is granted like the other Finance reporting silver.
--
-- Additive + idempotent (CREATE OR REPLACE VIEW; metric INSERT … ON CONFLICT (key) DO
-- NOTHING — re-runnable, a later authoring edit to a seeded row is not clobbered) +
-- transactional. Frontend-owned schema (ADR-0042). The OKF concept files
-- `metric_definition.md` + `time_record.md` and the coverage-matrix row are touched in THIS
-- PR (§11): a new derived silver object + the metric bound-seed inventory grows. No client
-- row-level data, no PII, no comp dollars, no secrets. DORMANT — NOT prod-applied until the
-- orchestrator/Mark runs it (each prod apply is Mark-gated).

BEGIN;

-- ── cost_allocation: per-client / per-service-line allocation basis (NO comp $) ──────────
-- One row per (account, service line, period month). Service line = the Autotask ticket
-- category the billable work was booked against (NULL = unallocated / no ticket join).
-- Billable hours come from time_record joined to its ticket → account; billable tooling
-- from expense_item's own client leg (autotask_company_id → account via entity_xref is a
-- later refinement — today we surface the raw company id alongside any directly-resolved
-- account). Labor HOURS only; the labor dollar is the governed metric's job (see header).
CREATE OR REPLACE VIEW cost_allocation AS
  WITH labor AS (
    SELECT
      tk.account_id                                   AS account_id,
      tk.category                                     AS service_line,
      date_trunc('month', tr.work_date)::date         AS period_month,
      COALESCE(SUM(tr.minutes), 0) / 60.0              AS billable_hours,
      0::numeric                                      AS billable_expense
    FROM time_record tr
    JOIN ticket tk
      ON tk.external_ref = tr.ancillary_ticket_ref
     OR tk.number        = tr.ancillary_ticket_ref
    WHERE tr.category = 'billable'
      AND tr.ancillary_ticket_ref IS NOT NULL
    GROUP BY tk.account_id, tk.category, date_trunc('month', tr.work_date)
  ),
  tooling AS (
    SELECT
      a.id                                            AS account_id,
      NULL::text                                      AS service_line,
      date_trunc('month', ei.item_date)::date         AS period_month,
      0::numeric                                      AS billable_hours,
      COALESCE(SUM(ei.amount), 0)                     AS billable_expense
    FROM expense_item ei
    LEFT JOIN account a ON FALSE   -- account resolution via entity_xref is a later slice;
                                   -- today tooling rolls up by company id, account_id NULL
    WHERE ei.billable = true
    GROUP BY a.id, date_trunc('month', ei.item_date)
  )
  SELECT
    account_id,
    service_line,
    period_month,
    SUM(billable_hours)   AS billable_hours,
    SUM(billable_expense) AS billable_expense
  FROM (SELECT * FROM labor UNION ALL SELECT * FROM tooling) parts
  GROUP BY account_id, service_line, period_month;

COMMENT ON VIEW cost_allocation IS
  'Cost-allocation model (#1091, profitability epic #1044): per-client (account) / per-service-line (ticket category) / per-month ALLOCATION BASIS — billable hours (from time_record→ticket→account) and billable tooling/expense dollars (from expense_item). Labor HOURS only — the labor DOLLAR is computed solely inside the governed labor_cost_to_serve / cost_to_serve metric expressions (the only readers of pay_rate, ADR-0082 §Security), so this broadly-granted view leaks no comp. License/tooling seat cost is the cost/seat true-up #1041 (dormant here). Derived silver (archetype C/F), Finance domain. No comp $, no PII, no secrets.';

-- ── Grants (0193/0139 defensive pattern; roles may be absent in some envs) ───────────────
-- Reporting reads only: web (BI hub, app-gated) + backend (metric engine / agents) +
-- pipelines (none needed — they write the source silver, not this derived view).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON cost_allocation TO "mgid-imperioncrm-web-prd";
  ELSE RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.'; END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON cost_allocation TO "mgid-imperioncrmbackendfunction";
  ELSE RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.'; END IF;
END $$;

-- ── Governed cost-to-serve metrics — the REAL labor basis 0193 anticipated ───────────────
-- Both are executable scalars the metric engine (#259) binds and runs in a read-only txn —
-- the single controlled reader of pay_rate. Effective rate = greatest pay_rate.effective_from
-- <= work_date, hourly (the ADR-0082 reconcile rule). NULL-safe: COALESCE the rate to 0 so a
-- not-yet-rated employee contributes 0 labor cost rather than nulling the whole aggregate.
INSERT INTO metric_definition (key, name, description, grain, unit, expression, owner, data_class) VALUES
  ('labor_cost_to_serve', 'Labor Cost to Serve',
   'Billable labor cost in the period = billable hours × each employee''s effective hourly Pay Rate (ADR-0082: greatest effective_from <= the work date). The labor leg of cost-to-serve and the real labor basis the profitability metrics (#1044) were waiting on (0193). Comp-sensitive: evaluated only by the backend metric engine (the one reader of pay_rate).',
   'company/monthly', 'usd',
   'SELECT COALESCE(SUM((tr.minutes / 60.0) * COALESCE((SELECT pr.hourly_rate FROM pay_rate pr WHERE pr.app_user_id = tr.app_user_id AND pr.rate_kind = ''hourly'' AND pr.effective_from <= tr.work_date ORDER BY pr.effective_from DESC LIMIT 1), 0)), 0) AS value FROM time_record tr WHERE tr.category = ''billable'' AND tr.work_date >= :period_start',
   'finance', 'financial'),

  ('cost_to_serve', 'Cost to Serve',
   'Total cost-to-serve in the period = labor_cost_to_serve (billable hours × effective Pay Rate) + billable tooling/expense (expense_item.billable). The cost-allocation total behind gross_profit (#1044). LICENSE seat cost is NOT yet included — it lands when the cost/seat true-up (#1041) gives license_assignment a per-seat cost; this contract evolves in place by key.',
   'company/monthly', 'usd',
   'SELECT ((SELECT COALESCE(SUM((tr.minutes / 60.0) * COALESCE((SELECT pr.hourly_rate FROM pay_rate pr WHERE pr.app_user_id = tr.app_user_id AND pr.rate_kind = ''hourly'' AND pr.effective_from <= tr.work_date ORDER BY pr.effective_from DESC LIMIT 1), 0)), 0) FROM time_record tr WHERE tr.category = ''billable'' AND tr.work_date >= :period_start) + (SELECT COALESCE(SUM(amount), 0) FROM expense_item WHERE billable = true AND item_date >= :period_start)) AS value',
   'finance', 'financial')
ON CONFLICT (key) DO NOTHING;

COMMIT;
