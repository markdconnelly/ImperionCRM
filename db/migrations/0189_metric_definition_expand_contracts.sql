-- 0189: Expand the governed metric-definitions store with seven new contracts (#1114, epic #1050).
-- Migration number 0189 claimed at MERGE per system CLAUDE.md §10.3 — authored against the
-- next-free-on-origin/main placeholder. A concurrent FE session (#1111) is also adding a
-- migration; the branch that merges second renumbers. Do NOT hardcode-depend on 0189.
--
-- WHY THIS EXISTS. `metric_definition` (0159) is the headless-BI contract — one governed row
-- per business number so agents (via the `metric_lookup` tool / backend #259/#264) and the BI
-- hub (#288) resolve identical figures. 0159 seeded five core numbers; 0180 rebound two to
-- executable scalars. This is slice 1 of epic #1050 ("expand the metric-definition store"):
-- it GROWS the governed contract set so more of the business's day-to-day numbers are
-- definition-governed rather than re-derived ad-hoc per surface. It is definitions only —
-- metric *values* (snapshot/timeseries) remain a deliberate later slice; #1115 builds the
-- agent+BI query interface, #1116 wires profitability & ROI onto these contracts.
--
-- WHAT IT ADDS. Seven new governed metrics spanning sales, service and finance. EVERY new
-- expression is an EXECUTABLE read-only `SELECT … AS value` scalar (the 0180 contract — not a
-- definitional fragment), with `:named` temporal params the engine binds. Each was proven to
-- run against the LIVE schema before authoring (column types + the scalar shape verified via
-- the read-only DB, §8): they read only over silver/operational entities that exist
-- (`opportunity`, `ticket`, `time_record`, `expense_item`) and return a single aggregate —
-- never row-level data.
--
--   sales:   new_business_mrr  (financial)    won-opportunity MRR closed in the period
--            win_rate          (operational)  won / (won+lost) of opportunities closed in period
--            pipeline_mrr      (financial)    open-opportunity MRR (not won/lost) — point-in-time
--   service: open_tickets      (operational)  tickets not yet closed — point-in-time backlog
--            avg_resolution_hours (operational) mean open→close hours for tickets closed in period
--   delivery:billable_hours    (operational)  billable time_record minutes → hours in the period
--   finance: reimbursable_expense (financial) reimbursable expense_item amount in the period
--
-- data_class follows the metric's sensitivity (the #1034 axis): money figures → financial;
-- counts/rates/hours → operational. Recorded from birth; no policy reads it yet.
--
-- Additive + idempotent (ON CONFLICT (key) DO NOTHING — re-runnable; a later authoring edit to
-- a seeded definition is not clobbered) + transactional. Frontend-owned schema (ADR-0042).
-- Governance/config (archetype H) — the OKF concept file `metric_definition.md` + its
-- coverage-matrix row are touched in THIS PR (§11): the entity SHAPE is unchanged, but its
-- documented seed inventory grows, so the concept timestamp + the row note are bumped.
-- No client row-level data, no PII, no secrets — expressions are formulas over aggregates.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply is Mark-gated).

BEGIN;

INSERT INTO metric_definition (key, name, description, grain, unit, expression, owner, data_class) VALUES
  ('new_business_mrr', 'New Business MRR',
   'Monthly recurring revenue from opportunities won (closed-won) in the period. The sales-led growth number; excludes renewals/expansion still modeled inside an existing contract.',
   'company/monthly', 'usd',
   'SELECT COALESCE(SUM(amount_mrr),0) AS value FROM opportunity WHERE sales_stage = ''won'' AND closed_at >= :period_start',
   'sales', 'financial'),

  ('win_rate', 'Win Rate %',
   'Won opportunities as a percent of opportunities that reached a terminal stage (won or lost) and closed in the period. Sales-effectiveness measure; ignores still-open pipeline.',
   'company/monthly', 'percent',
   'SELECT COUNT(*) FILTER (WHERE sales_stage = ''won'')::numeric / NULLIF(COUNT(*) FILTER (WHERE sales_stage IN (''won'',''lost'')), 0) * 100 AS value FROM opportunity WHERE closed_at >= :period_start',
   'sales', 'operational'),

  ('pipeline_mrr', 'Open Pipeline MRR',
   'Total MRR of opportunities still open (not won or lost) right now. Point-in-time forward-looking pipeline value; not period-bounded.',
   'point_in_time', 'usd',
   'SELECT COALESCE(SUM(amount_mrr),0) AS value FROM opportunity WHERE sales_stage NOT IN (''won'',''lost'')',
   'sales', 'financial'),

  ('open_tickets', 'Open Tickets',
   'Count of service tickets not yet closed right now — the current support backlog. Point-in-time; pairs with tickets_closed (the period flow).',
   'point_in_time', 'count',
   'SELECT COUNT(*) AS value FROM ticket WHERE closed_at IS NULL',
   'service-delivery', 'operational'),

  ('avg_resolution_hours', 'Average Resolution Hours',
   'Mean wall-clock hours from open to close for tickets closed in the period. SLA/quality signal; counts only tickets with a close timestamp.',
   'company/monthly', 'hours',
   'SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (closed_at - opened_at)) / 3600.0), 0) AS value FROM ticket WHERE closed_at >= :period_start',
   'service-delivery', 'operational'),

  ('billable_hours', 'Billable Hours',
   'Sum of billable time-record minutes converted to hours in the period. The delivery-throughput numerator (utilization denominator is available hours, technician_utilization).',
   'company/monthly', 'hours',
   'SELECT COALESCE(SUM(minutes),0) / 60.0 AS value FROM time_record WHERE category = ''billable'' AND work_date >= :period_start',
   'service-delivery', 'operational'),

  ('reimbursable_expense', 'Reimbursable Expense',
   'Sum of reimbursable expense-item amounts in the period (the employee-owed leg of Monthly Close, ADR-0083). Independent of the billable/client leg.',
   'company/monthly', 'usd',
   'SELECT COALESCE(SUM(amount),0) AS value FROM expense_item WHERE reimbursable = true AND item_date >= :period_start',
   'finance', 'financial')
ON CONFLICT (key) DO NOTHING;

COMMIT;
