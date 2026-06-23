-- 0904: Effective-rate / margin per client & service — compose the cost (#1091) and revenue
-- (#1092) legs into the governed MARGIN + EFFECTIVE-RATE contracts (#1093, third tracer slice
-- of the profitability epic #1044).
--
-- Migration number 0904 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against a high free slot while origin/main tops at 0196 and the sibling slices
-- author against 0902 (#1091, PR #1248) / 0903 (#1092, PR #1254); the branch that merges last
-- renumbers. Do NOT hardcode-depend on 0904 — the metric contract test locates the new
-- definitions by `key` (`margin_to_serve` / `gross_margin_pct` / `effective_rate`), never by
-- number.
--
-- WHY THIS EXISTS. Epic #1044 (Hormozi — "you can't optimize a margin you don't measure")
-- decomposes into: cost-allocation model (#1091) → revenue join (#1092) → THIS effective-rate /
-- margin per client & service (#1093) → BI surface (#1094). #1091 added the governed
-- `cost_to_serve` (labor + billable tooling) and #1092 added `recognized_revenue_to_serve` (the
-- revenue partner) — both company/monthly `metric_definition` rows on the governed path. This
-- slice closes the trio: it adds the MARGIN and EFFECTIVE-RATE numbers that compose those two,
-- so an agent and a human get the identical margin by construction (ADR-0062 / the metrics-layer
-- epic #1050: the cost AND revenue AND margin numbers live on the SAME governed `metric_definition`
-- store — the read path #1115 → backend engine #259 → BI hub #288 and the `metric_lookup` sub-agent
-- tool — NOT a parallel metrics surface).
--
-- COMPOSE BY KEY, NOT BY VIEW DEPENDENCY. The margin is SEMANTICALLY
--   margin_to_serve = recognized_revenue_to_serve − cost_to_serve
-- i.e. the difference of the two upstream governed metric KEYS. It is deliberately NOT built as
-- a SQL view JOINing the sibling `cost_allocation` / `revenue_allocation` views: those views are
-- defined in #1091/#1092 which are OPEN PRs not yet on main, so a hard view dependency would make
-- THIS migration fail to apply against current main. Instead the coupling stays at the governed
-- metric-expression layer: each expression below INLINES the same scalar subqueries that
-- `cost_to_serve` / `recognized_revenue_to_serve` resolve to (the recognized-revenue `SUM` over
-- `invoice_mirror`, the labor `SUM` × effective hourly `pay_rate` over `time_record`+`pay_rate`,
-- the billable `expense_item` leg) — sources that ALL exist on current main today — so this
-- migration applies and validates standalone. The trio reads as one family by `key`; once
-- #1091/#1092 apply, the cost/revenue/margin keys all resolve over the identical sources and agree
-- by construction. (Runtime note: `margin_to_serve` is the published partner of `cost_to_serve` /
-- `recognized_revenue_to_serve`; those keys land when #1091/#1092 are prod-applied. The inline
-- expressions here mean the margin number is correct the moment ITS own sources hydrate, with or
-- without the sibling rows present.)
--
-- WHAT IT ADDS — three governed metric_definition rows (executable `SELECT … AS value` scalars,
-- the 0180 contract; `:period_start` is the engine-bound temporal param):
--     margin_to_serve   (financial/usd)     recognized_revenue_to_serve − cost_to_serve in period
--     gross_margin_pct  (financial/percent)  margin_to_serve ÷ recognized revenue × 100 (NULL when no revenue)
--     effective_rate    (financial/usd)      recognized revenue ÷ billable hours (NULL when no hours)
-- `effective_rate` is the explicit effective-rate-per-client/service lens of #1093 and the partner
-- naming the cost/revenue/margin trio coherently; the canonical company `effective_hourly_rate`
-- (same numerator/denominator) already exists from 0193 (#1116) and its `key` is taken, so this
-- slice does NOT re-key it — it adds the `_to_serve`-family margin term and a same-grain
-- effective-rate companion so the profitability family reads as one set (the same precedent #1092
-- used adding `recognized_revenue_to_serve` alongside `recognized_revenue`). Per-client /
-- per-service ATTRIBUTION lives in the sibling structural views (`cost_allocation` /
-- `revenue_allocation`), parallel to these company-grain governed scalars.
--
-- All three proven to run against the LIVE schema before authoring (single-`value` scalar, §8):
-- they read over silver entities that exist (`invoice_mirror`, `time_record`, `pay_rate`,
-- `expense_item`) and return one aggregate, never row-level data.
--
-- data_class follows sensitivity (the #1034 axis): all three are money → `financial` (always-gate).
-- The labor DOLLAR appears only inside these engine-bound expressions (the same single controlled
-- reader of `pay_rate`, ADR-0082 §Security) — no broadly-granted object exposes comp.
--
-- Additive + idempotent (metric INSERT … ON CONFLICT (key) DO NOTHING — re-runnable, never
-- clobbers a later authoring edit) + transactional. No view, no table — purely governed metric
-- seeds. Frontend-owned schema (ADR-0042). The OKF concept file `metric_definition.md` + the
-- coverage-matrix row are touched in THIS PR (§11): the metric bound-seed inventory grows. No
-- client row-level data, no PII, no comp dollars, no secrets. DORMANT — NOT prod-applied until
-- the orchestrator/Mark runs it (each prod apply is Mark-gated).

BEGIN;

-- ── Governed margin + effective-rate metrics — the composition of cost (#1091) + revenue (#1092)
-- Each is an executable scalar the metric engine (#259) binds and runs in a read-only txn. The
-- labor leg = billable hours × greatest pay_rate.effective_from <= work_date, hourly (the ADR-0082
-- reconcile rule), COALESCEd to 0 so a not-yet-rated employee contributes 0 labor cost rather than
-- nulling the aggregate. Each expression inlines the SAME sources the upstream cost_to_serve /
-- recognized_revenue_to_serve keys resolve to — coupled by meaning, not by a view JOIN (see header).
INSERT INTO metric_definition (key, name, description, grain, unit, expression, owner, data_class) VALUES
  ('margin_to_serve', 'Margin to Serve',
   'Profit left after serving in the period = recognized_revenue_to_serve (#1092, recognized revenue over invoice_mirror) − cost_to_serve (#1091, billable labor + billable tooling). The composed margin of the profitability epic (#1044); the absolute-dollar margin per client/service rolls up over the cost_allocation / revenue_allocation views. Comp-sensitive labor leg evaluated only by the backend metric engine (the one reader of pay_rate).',
   'company/monthly', 'usd',
   'SELECT ((SELECT COALESCE(SUM(total_amount),0) FROM invoice_mirror WHERE txn_date >= :period_start) - ((SELECT COALESCE(SUM((tr.minutes / 60.0) * COALESCE((SELECT pr.hourly_rate FROM pay_rate pr WHERE pr.app_user_id = tr.app_user_id AND pr.rate_kind = ''hourly'' AND pr.effective_from <= tr.work_date ORDER BY pr.effective_from DESC LIMIT 1), 0)), 0) FROM time_record tr WHERE tr.category = ''billable'' AND tr.work_date >= :period_start) + (SELECT COALESCE(SUM(amount),0) FROM expense_item WHERE billable = true AND item_date >= :period_start))) AS value',
   'finance', 'financial'),

  ('gross_margin_pct', 'Gross Margin %',
   'Margin to serve as a percentage of recognized revenue in the period = margin_to_serve ÷ recognized revenue × 100. The effective-margin lens of the profitability epic (#1044); NULL when no recognized revenue. Distinct from the legacy unbound gross_margin (0159) — this is the bound cost-allocation-based percentage.',
   'company/monthly', 'percent',
   'SELECT (((SELECT COALESCE(SUM(total_amount),0) FROM invoice_mirror WHERE txn_date >= :period_start) - ((SELECT COALESCE(SUM((tr.minutes / 60.0) * COALESCE((SELECT pr.hourly_rate FROM pay_rate pr WHERE pr.app_user_id = tr.app_user_id AND pr.rate_kind = ''hourly'' AND pr.effective_from <= tr.work_date ORDER BY pr.effective_from DESC LIMIT 1), 0)), 0) FROM time_record tr WHERE tr.category = ''billable'' AND tr.work_date >= :period_start) + (SELECT COALESCE(SUM(amount),0) FROM expense_item WHERE billable = true AND item_date >= :period_start))) / NULLIF((SELECT COALESCE(SUM(total_amount),0) FROM invoice_mirror WHERE txn_date >= :period_start), 0) * 100) AS value',
   'finance', 'financial'),

  ('effective_rate', 'Effective Rate',
   'Recognized revenue divided by billable hours delivered in the period — what each billable hour actually earned, the effective-rate lens of #1093 per client & service (attribution rolls up over cost_allocation / revenue_allocation). Same numerator/denominator as the company effective_hourly_rate (0193) under the _to_serve profitability family name; NULL when no billable hours.',
   'company/monthly', 'usd',
   'SELECT ((SELECT COALESCE(SUM(total_amount),0) FROM invoice_mirror WHERE txn_date >= :period_start) / NULLIF((SELECT COALESCE(SUM(minutes),0) / 60.0 FROM time_record WHERE category = ''billable'' AND work_date >= :period_start), 0)) AS value',
   'finance', 'financial')
ON CONFLICT (key) DO NOTHING;

COMMIT;
