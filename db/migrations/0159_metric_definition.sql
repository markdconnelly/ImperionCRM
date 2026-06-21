-- 0159: governed metric-definitions store — the headless-BI contract (#1055, epic #1050).
-- Migration number 0159 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY THIS EXISTS. Today there is NO metrics-governance layer: numbers are computed ad-hoc
-- in source tables (campaign_metric, social_metric, forecast_snapshot) and re-derived per
-- surface, so a human dashboard and an agent can disagree on "MRR". `metric_definition` is
-- the single governed contract for a business number: one row per metric, carrying its
-- canonical name, grain, unit, the definition (SQL/formula the metric engine binds), an
-- owner, and a `data_class` sensitivity (the #1034 RLS/action axis). The backend metric
-- query endpoint (#259) and the dashboards (#288) both read THIS, so they agree by
-- construction. Profitability (#1044) and the ROI "two numbers" dashboard (#1048) wire onto
-- it. Metric *values* (a snapshot/timeseries) are a deliberate follow-up slice — this PR is
-- the definition contract + a reviewed seed only (~400-line budget, #1055 acceptance).
--
-- `data_class` pre-stages the #1034 taxonomy (5 coarse classes). No policy reads it yet;
-- it is recorded now so every governed number carries its sensitivity from birth.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). Governance/config
-- (archetype H) — a horizontal governed entity (sibling of agent_tool_grant), so it gets an
-- OKF concept file + coverage-matrix row (§11) in this PR. No client row-level data, no PII,
-- no secrets (definitions are formulas over aggregates). DORMANT — NOT prod-applied until the
-- orchestrator/Mark runs it (each prod apply is Mark-gated).

BEGIN;

CREATE TABLE IF NOT EXISTS metric_definition (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,                  -- machine name, e.g. 'mrr' — the stable handle agents/APIs reference
  name        text NOT NULL,                         -- human display name, e.g. 'Monthly Recurring Revenue'
  description text,                                   -- what the number means and what it excludes
  grain       text NOT NULL,                          -- the unit of aggregation, e.g. 'company/monthly', 'per_technician/weekly', 'point_in_time'
  unit        text NOT NULL,                          -- 'usd' | 'percent' | 'count' | 'hours' | 'ratio'
  expression  text,                                   -- the governed definition (SQL or formula); the metric engine (#259) binds it. NULL = not yet bound
  owner       text,                                   -- the role/team accountable for the definition, e.g. 'finance', 'service-delivery'
  data_class  text NOT NULL DEFAULT 'operational'
                CHECK (data_class IN
                  ('operational','financial','people_hr','security_credentials','client_pii')),
  active      boolean NOT NULL DEFAULT true,          -- soft-retire a definition without deleting its history
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE metric_definition IS
  'Governed metric-definitions store (#1055, ADR pending). One row = one business number''s '
  'canonical contract (name, grain, unit, definition, owner, data_class). The headless-BI '
  'source of truth read by the backend metric query endpoint (#259) and the human dashboards '
  '(#288) so agents and humans agree. data_class is the #1034 sensitivity axis. No PII/secrets.';
COMMENT ON COLUMN metric_definition.expression IS
  'The governed definition as SQL or a formula over aggregates; bound/executed by the metric '
  'engine (backend #259), never holds row-level data. NULL until a definition is bound.';
COMMENT ON COLUMN metric_definition.data_class IS
  'Sensitivity class (the #1034 third RLS / action-ceiling axis): operational | financial | '
  'people_hr | security_credentials | client_pii. Recorded now; no policy reads it yet.';

CREATE INDEX IF NOT EXISTS metric_definition_data_class_idx ON metric_definition (data_class);
CREATE INDEX IF NOT EXISTS metric_definition_active_idx     ON metric_definition (active);

-- Reviewed seed: the core numbers the business + agents both need. ON CONFLICT keeps this
-- re-runnable; editing a seeded definition later (authoring surface) survives a re-run.
INSERT INTO metric_definition (key, name, description, grain, unit, expression, owner, data_class) VALUES
  ('mrr', 'Monthly Recurring Revenue',
   'Sum of active recurring contract value normalized to a monthly figure. Excludes one-off / project revenue.',
   'company/monthly', 'usd',
   'SUM(monthly_normalized_value) FROM contract WHERE status = ''active''',
   'finance', 'financial'),

  ('gross_margin', 'Gross Margin %',
   'Revenue minus cost of delivery (labor + licensing + hardware passthrough) as a percent of revenue, trailing month.',
   'company/monthly', 'percent',
   '(revenue - cost_of_delivery) / NULLIF(revenue, 0) * 100',
   'finance', 'financial'),

  ('technician_utilization', 'Technician Utilization %',
   'Billable hours as a percent of available hours per technician, trailing week. Drives capacity planning (#1039).',
   'per_technician/weekly', 'percent',
   'SUM(billable_hours) / NULLIF(SUM(available_hours), 0) * 100 FROM time_record GROUP BY technician',
   'service-delivery', 'operational'),

  ('tickets_closed', 'Tickets Closed',
   'Count of Autotask tickets transitioned to a closed/complete status in the period.',
   'company/daily', 'count',
   'COUNT(*) FROM autotask_ticket WHERE closed_at::date = :period',
   'service-delivery', 'operational'),

  ('agent_compute_cost', 'Agent Compute Cost',
   'Total LLM + embedding spend attributed to agent runs in the period (the autonomy ROI denominator, #1048).',
   'company/monthly', 'usd',
   'SUM(cost_usd) FROM agent_run WHERE started_at >= :period_start',
   'platform', 'financial')
ON CONFLICT (key) DO NOTHING;

-- ── Least-privilege grants (0056/0154 defensive pattern; roles may be absent in some envs) ─
DO $$
BEGIN
  -- Backend MI is the metric engine — it reads definitions and (later) writes computed values.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON metric_definition TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  -- Web reads for rendering (the BI hub / dashboards); admin authoring writes happen via backend.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON metric_definition TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
END $$;

COMMIT;
