-- 0903: Revenue join — allocate RECOGNIZED + CONTRACTED revenue per client & service, and
-- give the governed profitability metrics a stable revenue partner to the cost side (#1092,
-- second tracer slice of the profitability epic #1044).
--
-- Migration number 0903 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against a high free slot while origin/main tops at 0195 and the cost slice (#1091,
-- PR #1248) authors against 0902; the branch that merges second renumbers. Do NOT hardcode-
-- depend on 0903 — the metric contract test locates the new definition by `key`
-- (`recognized_revenue_to_serve`), never by number.
--
-- WHY THIS EXISTS. Epic #1044 (Hormozi — "you can't optimize a margin you don't measure")
-- decomposes into: cost-allocation model (#1091) → THIS revenue join (#1092) → effective-
-- rate / margin per client & service (#1093) → BI surface (#1094). The cost slice #1091 added
-- the `cost_allocation` view + the governed `labor_cost_to_serve` / `cost_to_serve` metrics
-- (company/monthly). This slice is its mirror image on the revenue side: it joins recognized
-- and contracted revenue to client × service-line × month, parallel to `cost_allocation`, so
-- the margin slice #1093 can compose `margin = recognized_revenue - cost_to_serve` purely by
-- metric KEY — no code import, the governed metrics layer is the only coupling (ADR-0062 / the
-- metrics-layer epic #1050: the cost AND revenue numbers go onto the EXISTING governed
-- `metric_definition` store, the same read path #1115 → backend engine #259 → BI hub #288 and
-- the `metric_lookup` sub-agent tool, NOT a parallel metrics surface). Agents and humans then
-- get the IDENTICAL revenue/cost/margin numbers by construction.
--
-- METRIC KEYS. The canonical company/monthly headline revenue number `recognized_revenue`
-- (over `invoice_mirror`) ALREADY EXISTS, seeded by the profitability/ROI slice #1116 (0193);
-- its UNIQUE `key` is taken and it is exactly the term #1093 subtracts cost_to_serve from. This
-- slice therefore does NOT re-key it. It adds:
--   • `recognized_revenue_to_serve` (company/monthly, financial/usd) — the explicit revenue
--     PARTNER to `cost_to_serve`, naming the cost/revenue/margin trio as one family (the same
--     `:period_start`-bound `SUM(total_amount)` over `invoice_mirror`). #1093 may compose margin
--     against either `recognized_revenue` or this — both are the same recognized-revenue scalar;
--     this one carries the `_to_serve` family name so the profitability trio reads coherently.
--
-- WHAT IT ADDS.
--   1. VIEW revenue_allocation — derived (archetype C/F), Finance domain. The per-client
--      (account) × per-service-line × month REVENUE JOIN, the exact mirror of `cost_allocation`.
--      Two legs UNION-ALL'd (the cost view's labor+tooling shape):
--        recognized leg — recognized revenue from `invoice_mirror.total_amount` grouped by
--          account × month. Invoices carry NO service-line dimension (header grain), so
--          service_line is NULL on this leg — the same honest-NULL precedent the cost view
--          uses for its tooling/expense leg (no fabricated attribution).
--        contracted leg — contracted/recurring revenue from `contract.estimated_revenue`
--          grouped by account × `contract.category` (the service line, the revenue analog of
--          the cost view's `ticket.category`) × month, active contracts only.
--      Revenue dollars here are already client-facing (invoice/contract totals the client sees),
--      so the view carries no NEW sensitivity beyond the `invoice`/`contract` silver it rolls up
--      — unlike the cost view it has no comp-leak concern (no pay_rate anywhere on the revenue
--      side). Granted like the other Finance reporting silver.
--   2. One governed metric_definition row (executable `SELECT … AS value` scalar, the 0180
--      contract; `:period_start` engine-bound):
--        recognized_revenue_to_serve (financial) recognized revenue in period (invoice_mirror)
--      Proven to run against the LIVE schema before authoring (single-`value` scalar, §8):
--      reads over `invoice_mirror` (which exists) and returns one aggregate, never row-level data.
--
-- data_class follows sensitivity (the #1034 axis): the new metric is money → `financial`
-- (always-gate). The view exposes client-facing revenue aggregates → granted like the other
-- Finance reporting silver (the `cost_allocation` / `invoice_mirror` precedent).
--
-- Additive + idempotent (CREATE OR REPLACE VIEW; metric INSERT … ON CONFLICT (key) DO NOTHING
-- — re-runnable, never clobbers a later authoring edit) + transactional. Frontend-owned schema
-- (ADR-0042). The OKF concept files `metric_definition.md` + `invoice.md` + `contract.md` and
-- the coverage-matrix row are touched in THIS PR (§11): a new derived silver object + the metric
-- bound-seed inventory grows + two source entities gain a join path. No client row-level data,
-- no PII, no comp dollars, no secrets. DORMANT — NOT prod-applied until the orchestrator/Mark
-- runs it (each prod apply is Mark-gated).

BEGIN;

-- ── revenue_allocation: per-client / per-service-line revenue join (mirror of cost_allocation)
-- One row per (account, service line, period month). Recognized leg = invoice_mirror (no
-- service line → NULL, the honest-NULL precedent). Contracted leg = contract.estimated_revenue
-- by contract.category (the service line) for active contracts. Pure aggregates; no row-level
-- data, no comp $ (revenue has none).
CREATE OR REPLACE VIEW revenue_allocation AS
  WITH recognized AS (
    SELECT
      im.account_id                                   AS account_id,
      NULL::text                                      AS service_line,
      date_trunc('month', im.txn_date)::date          AS period_month,
      COALESCE(SUM(im.total_amount), 0)               AS recognized_revenue,
      0::numeric                                      AS contracted_revenue
    FROM invoice_mirror im
    WHERE im.txn_date IS NOT NULL
    GROUP BY im.account_id, date_trunc('month', im.txn_date)
  ),
  contracted AS (
    SELECT
      c.account_id                                    AS account_id,
      c.category                                      AS service_line,
      date_trunc('month', c.start_date)::date         AS period_month,
      0::numeric                                      AS recognized_revenue,
      COALESCE(SUM(c.estimated_revenue), 0)           AS contracted_revenue
    FROM contract c
    WHERE c.status = 'active'
      AND c.start_date IS NOT NULL
    GROUP BY c.account_id, c.category, date_trunc('month', c.start_date)
  )
  SELECT
    account_id,
    service_line,
    period_month,
    SUM(recognized_revenue) AS recognized_revenue,
    SUM(contracted_revenue) AS contracted_revenue
  FROM (SELECT * FROM recognized UNION ALL SELECT * FROM contracted) parts
  GROUP BY account_id, service_line, period_month;

COMMENT ON VIEW revenue_allocation IS
  'Revenue join (#1092, profitability epic #1044): per-client (account) / per-service-line / per-month REVENUE — the exact mirror of cost_allocation. Recognized leg = recognized revenue from invoice_mirror (header grain → service_line NULL, the honest-NULL precedent); contracted leg = contracted/recurring revenue from contract.estimated_revenue by contract.category (the service line) for active contracts. The governed company/monthly revenue scalar (recognized_revenue / recognized_revenue_to_serve) is what #1093 composes margin = recognized_revenue - cost_to_serve against, by metric key. Derived silver (archetype C/F), Finance domain. No comp $, no PII, no secrets.';

-- ── Grants (0193/0139/cost_allocation defensive pattern; roles may be absent in some envs) ──
-- Reporting reads only: web (BI hub, app-gated) + backend (metric engine / agents).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON revenue_allocation TO "mgid-imperioncrm-web-prd";
  ELSE RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.'; END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON revenue_allocation TO "mgid-imperioncrmbackendfunction";
  ELSE RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.'; END IF;
END $$;

-- ── Governed revenue metric — the revenue partner to cost_to_serve ───────────────────────
-- Executable scalar the metric engine (#259) binds and runs in a read-only txn. Same recognized-
-- revenue basis as the canonical `recognized_revenue` (#1116/0193), carrying the `_to_serve`
-- family name so the cost/revenue/margin trio (#1044) reads coherently. NULL-safe via COALESCE.
INSERT INTO metric_definition (key, name, description, grain, unit, expression, owner, data_class) VALUES
  ('recognized_revenue_to_serve', 'Recognized Revenue to Serve',
   'Recognized revenue in the period = SUM(invoice_mirror.total_amount) with txn_date in period (QBO-mirrored, ADR-0085). The revenue partner to cost_to_serve (#1091): the margin slice (#1093) composes margin = recognized_revenue_to_serve - cost_to_serve per client/service. Same recognized-revenue basis as the canonical company/monthly recognized_revenue (#1116); named here so the profitability trio (revenue / cost / margin, #1044) reads as one family. Per-client / per-service attribution lives in the revenue_allocation view.',
   'company/monthly', 'usd',
   'SELECT COALESCE(SUM(total_amount), 0) AS value FROM invoice_mirror WHERE txn_date >= :period_start',
   'finance', 'financial')
ON CONFLICT (key) DO NOTHING;

COMMIT;
