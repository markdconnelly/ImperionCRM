-- 0193: Wire PROFITABILITY (#1044) and ROI (#1048) onto the governed metric-definitions
-- store as five new executable contracts (#1116 — third/final child of epic #1050).
-- Migration number 0193 claimed at MERGE per system CLAUDE.md §10.3 — authored against the
-- next-free-on-origin/main placeholder (main tops at 0191). Concurrent FE sessions (#1113)
-- are also adding migrations; the branch that merges second renumbers. Do NOT hardcode-depend
-- on 0193 — the contract test locates this file by content (`recognized_revenue`), not number.
--
-- WHY THIS EXISTS. Epic #1050 (governed metrics layer, "Elon — numeric source of truth")
-- decomposed into: expand the store (#1114, 0189) → agent+BI query interface (#1115,
-- `src/lib/metrics/query.ts`) → THIS slice: make the profitability (#1044) and ROI (#1048)
-- epics consume the governed store instead of re-deriving margin / effective-rate / agent-ROI
-- ad-hoc per surface. Per ADR-0042 / ADR-0062 the way to do that is NOT a parallel query path —
-- it is to add the missing numbers as governed `metric_definition` rows so the EXISTING read
-- path (#1115 → backend metric engine #259, the same path the `metric_lookup` sub-agent tool
-- and the BI hub #288 use) resolves them. Profitability/ROI surfaces then reference these by
-- `key`; agents and humans get the IDENTICAL number by construction.
--
-- WHAT IT ADDS. Five new governed metrics — three profitability (finance), two agent-ROI
-- (platform). EVERY expression is an EXECUTABLE read-only `SELECT … AS value` scalar (the 0180
-- contract — not a definitional fragment), with `:period_start` the temporal param the engine
-- binds. Each was proven to run against the LIVE schema before authoring (column types + the
-- single-`value` scalar shape verified via the read-only DB, §8): they read only over silver/
-- operational entities that exist (`invoice_mirror`, `expense_item`, `time_record`, `agent_run`)
-- and return a single aggregate — never row-level data. A NULL on a zero denominator is the
-- engine-safe shape (mirrors the 0189 `win_rate` precedent), never a divide-by-zero error.
--
--   PROFITABILITY (#1044 — Hormozi "you can't optimize a margin you don't measure"):
--     recognized_revenue    (financial) invoiced revenue (invoice_mirror.total_amount) in period
--     gross_profit          (financial) recognized revenue − billable cost-to-serve in period
--     effective_hourly_rate (financial) recognized revenue ÷ billable hours in period
--   ROI (#1048 — Ramsey "two numbers" / agent value telemetry):
--     agent_tickets_worked  (operational) succeeded agent_run count in period — "work done"
--     agent_cost_per_run    (financial)   agent compute cost ÷ succeeded runs — ROI efficiency
--
-- data_class follows the metric's sensitivity (the #1034 axis): money figures → financial;
-- the work-done count → operational. Recorded from birth; the #1115 read path enforces it.
--
-- gross_profit / effective_hourly_rate use scalar SUBqueries (not a join) so each stays a
-- single-row `SELECT … AS value` the engine binds unchanged — revenue and cost are independent
-- period aggregates over different entities. cost-to-serve here is the billable expense leg
-- (expense_item.billable); a labor-rate cost basis lands when time_record carries a rate
-- (profitability epic #1091 cost-allocation model) — these contracts evolve in place by `key`.
--
-- Additive + idempotent (ON CONFLICT (key) DO NOTHING — re-runnable; a later authoring edit to
-- a seeded definition is not clobbered) + transactional. Frontend-owned schema (ADR-0042).
-- Governance/config (archetype H) — the OKF concept file `metric_definition.md` + its
-- coverage-matrix row are touched in THIS PR (§11): the entity SHAPE is unchanged, but its
-- documented bound-seed inventory grows, so the concept timestamp + the row note are bumped.
-- No client row-level data, no PII, no secrets — expressions are formulas over aggregates.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply is Mark-gated).

BEGIN;

INSERT INTO metric_definition (key, name, description, grain, unit, expression, owner, data_class) VALUES
  ('recognized_revenue', 'Recognized Revenue',
   'Total invoiced revenue (sum of invoice amounts) dated in the period. The profitability numerator (epic #1044); QBO-mirror sourced, independent of cash collection (AR is a separate flow).',
   'company/monthly', 'usd',
   'SELECT COALESCE(SUM(total_amount),0) AS value FROM invoice_mirror WHERE txn_date >= :period_start',
   'finance', 'financial'),

  ('gross_profit', 'Gross Profit',
   'Recognized revenue minus the billable cost-to-serve (billable expense items) in the period. The absolute-dollar margin behind the gross_margin percentage; cost basis grows as the cost-allocation model (#1091) adds labor.',
   'company/monthly', 'usd',
   'SELECT (SELECT COALESCE(SUM(total_amount),0) FROM invoice_mirror WHERE txn_date >= :period_start) - (SELECT COALESCE(SUM(amount),0) FROM expense_item WHERE billable = true AND item_date >= :period_start) AS value',
   'finance', 'financial'),

  ('effective_hourly_rate', 'Effective Hourly Rate',
   'Recognized revenue divided by billable hours delivered in the period — what each billable hour actually earned. The effective-rate lens of the profitability epic (#1044); NULL when no billable hours.',
   'company/monthly', 'usd',
   'SELECT (SELECT COALESCE(SUM(total_amount),0) FROM invoice_mirror WHERE txn_date >= :period_start) / NULLIF((SELECT COALESCE(SUM(minutes),0) / 60.0 FROM time_record WHERE category = ''billable'' AND work_date >= :period_start), 0) AS value',
   'finance', 'financial'),

  ('agent_tickets_worked', 'Agent Work Done',
   'Count of agent runs that succeeded in the period — the "work done" number of the ROI two-numbers pair (#1048). Pairs with agent_compute_cost (the spend leg) to frame agent ROI.',
   'company/monthly', 'count',
   'SELECT COUNT(*) FILTER (WHERE status = ''succeeded'') AS value FROM agent_run WHERE started_at >= :period_start',
   'platform', 'operational'),

  ('agent_cost_per_run', 'Agent Cost per Run',
   'Total agent compute spend divided by the number of succeeded runs in the period — unit economics of agent work (#1048). NULL when no succeeded runs; falls as the agents do more per dollar.',
   'company/monthly', 'usd',
   'SELECT COALESCE(SUM(cost_usd),0) / NULLIF(COUNT(*) FILTER (WHERE status = ''succeeded''), 0) AS value FROM agent_run WHERE started_at >= :period_start',
   'platform', 'financial')
ON CONFLICT (key) DO NOTHING;

COMMIT;
