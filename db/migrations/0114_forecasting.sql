-- 0114 revenue forecasting — opportunity forecast fields + quota + forecast_snapshot
-- (ADR-0072, issue #381, epic #316 · parent #314).
-- Migration number 0114 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration merges
-- during the CI window, renumber the file (rename is data-safe).
--
-- The schema heavy lane of the forecasting vertical (epic #316, ADR-0072). Today we
-- can see a pipeline but cannot forecast from it: there is no expected close date
-- (distinct from the actual close), no win probability, no forecast category (the
-- human commit/best-case judgement, independent of stage), no quota, and no
-- point-in-time history for trend or accuracy. ADR-0072 settles their shape. The
-- forecast VIEW + set-controls (#383) and the nightly snapshot JOB (#382, backend/
-- pipeline) build on this schema; this front end (ADR-0042) only READS — it ships a
-- read model (listOpportunityForecast / listQuotas) so the surface lane can build.
--
-- Three changes:
--
--   1. opportunity gains three forecast fields (ADR-0072 decision 1):
--      - expected_close_date — the FORECASTED close, distinct from closed_at (the
--        ACTUAL close set on won/lost). What period a deal forecasts into.
--      - win_probability numeric (0..1). Defaulted PER sales_stage and owner-
--        overridable. The per-stage default is applied in the app read model
--        (lib/forecast.ts), not as a column DEFAULT, because it depends on the row's
--        stage; the column stays nullable = "use the stage default".
--      - forecast_category — the owner's explicit commit | best_case | pipeline |
--        omitted call. INDEPENDENT of sales_stage (ADR-0072 decision 2 / fact 1): a
--        late-stage deal can still be best-case, an early deal omitted. Stage may
--        suggest a category but never silently sets it. NULL = not yet categorised.
--      Deal value stays amount_mrr in v1 and becomes quote-derived post-CPQ
--      (ADR-0067) — forecasting reads a deal-value field, it does not block on CPQ.
--
--   2. quota (NEW) — a revenue target per (owner | team, period). Exactly one of
--      owner_user_id / team is set (a quota is for a person OR a team, never both).
--      Attainment = closed-won in the period / quota.amount (a runtime computation,
--      not stored here).
--
--   3. forecast_snapshot (NEW) — a nightly, point-in-time capture per owner/period of
--      the weighted + categorised totals + closed-won + quota. Powers the
--      forecast-over-time trend and forecast-accuracy (the call N weeks ago vs the
--      eventual actual). WRITTEN by the backend/pipeline snapshot job (#382, ADR-0042
--      — a process, not the front end); the front end READS it for the trend (#384).
--      (provider-free; bounded growth = one row per owner/period/day, prune policy
--      is a future item, ADR-0072 consequences.) Idempotent per
--      (captured_on, owner|team, period) so a re-run of the nightly job does not
--      duplicate.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets. Revenue + quota are RBAC-gated
-- server-side (ADR-0030/0016 — canSeeRevenue blanks money for Support); this
-- migration creates structure only, no data.

BEGIN;

-- ── opportunity: forecast fields (ADR-0072 decision 1) ───────────────────────────
ALTER TABLE opportunity
  ADD COLUMN IF NOT EXISTS expected_close_date date,
  ADD COLUMN IF NOT EXISTS win_probability     numeric
    CHECK (win_probability IS NULL OR (win_probability >= 0 AND win_probability <= 1)),
  ADD COLUMN IF NOT EXISTS forecast_category   text
    CHECK (forecast_category IS NULL OR
      forecast_category IN ('commit', 'best_case', 'pipeline', 'omitted'));

COMMENT ON COLUMN opportunity.expected_close_date IS
  'Forecasted close date (ADR-0072) — the period a deal forecasts into. Distinct from closed_at, the ACTUAL close set on won/lost.';
COMMENT ON COLUMN opportunity.win_probability IS
  'Win probability 0..1 (ADR-0072). Defaulted per sales_stage in the app read model (lib/forecast.ts), owner-overridable; NULL = use the stage default. Weighted forecast = Σ(deal_value × win_probability).';
COMMENT ON COLUMN opportunity.forecast_category IS
  'Owner''s explicit forecast call: commit | best_case | pipeline | omitted (ADR-0072 decision 2). INDEPENDENT of sales_stage — stage may suggest but never sets it. NULL = not yet categorised. omitted = excluded from the forecast.';

-- Forecast reads slice open deals by their forecast period.
CREATE INDEX IF NOT EXISTS idx_opportunity_expected_close ON opportunity (expected_close_date);

-- ── quota: revenue target per owner | team, per period (ADR-0072 decision 4) ─────
CREATE TABLE IF NOT EXISTS quota (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  team          text,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  amount        numeric NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Exactly one of owner_user_id / team set (ADR-0072 sketch: a quota is for a
  -- person OR a team, never both, never neither).
  CONSTRAINT quota_owner_xor_team CHECK (num_nonnulls(owner_user_id, team) = 1),
  CONSTRAINT quota_period_order   CHECK (period_end >= period_start)
);
COMMENT ON TABLE quota IS
  'Revenue target per (owner | team, period) for forecast attainment (ADR-0072 decision 4, #381). Attainment = closed-won in period / amount (computed at read, not stored). Exactly one of owner_user_id / team is set. Quota is revenue-sensitive — RBAC-gated like MRR (ADR-0030).';

-- Lookup the quota for an owner/team covering a period.
CREATE INDEX IF NOT EXISTS idx_quota_owner_period ON quota (owner_user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_quota_team_period  ON quota (team, period_start, period_end);

DROP TRIGGER IF EXISTS trg_quota_updated ON quota;
CREATE TRIGGER trg_quota_updated BEFORE UPDATE ON quota
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── forecast_snapshot: nightly point-in-time forecast (ADR-0072 decision 5) ──────
CREATE TABLE IF NOT EXISTS forecast_snapshot (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_on      date NOT NULL,
  owner_user_id    uuid REFERENCES app_user(id) ON DELETE SET NULL,
  team             text,
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  weighted         numeric NOT NULL DEFAULT 0,  -- Σ(deal_value × win_probability)
  commit_total     numeric NOT NULL DEFAULT 0,
  best_case_total  numeric NOT NULL DEFAULT 0,
  pipeline_total   numeric NOT NULL DEFAULT 0,
  closed_won       numeric NOT NULL DEFAULT 0,  -- realised floor in the period
  quota            numeric,                     -- the quota.amount in force at capture (nullable)
  created_at       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE forecast_snapshot IS
  'Nightly point-in-time forecast per owner/period (ADR-0072 decision 5, #381): weighted + categorised totals + closed-won + quota as they stood on captured_on. Powers the forecast-over-time trend and forecast-accuracy (the call N weeks ago vs the eventual actual). WRITTEN by the backend/pipeline snapshot job (#382, ADR-0042); the front end reads it. Revenue-sensitive — RBAC-gated (ADR-0030).';
COMMENT ON COLUMN forecast_snapshot.weighted IS
  'Σ(deal_value × win_probability) over open deals in the period at capture (ADR-0072 decision 3 — the pipeline-health number).';
COMMENT ON COLUMN forecast_snapshot.closed_won IS
  'Closed-won revenue in the period at capture — the realised floor (ADR-0072 decision 3).';

-- Idempotent nightly upsert: one snapshot per (captured_on, owner|team, period).
-- Two partial-UNIQUE indexes (owner-scoped vs team-scoped) because a NULL never
-- equals NULL in a plain UNIQUE — the partials make the dedupe key total.
CREATE UNIQUE INDEX IF NOT EXISTS uq_forecast_snapshot_owner
  ON forecast_snapshot (captured_on, owner_user_id, period_start, period_end)
  WHERE owner_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_forecast_snapshot_team
  ON forecast_snapshot (captured_on, team, period_start, period_end)
  WHERE team IS NOT NULL;
-- Trend read: a series for an owner/period over time.
CREATE INDEX IF NOT EXISTS idx_forecast_snapshot_owner_period
  ON forecast_snapshot (owner_user_id, period_start, period_end, captured_on);

-- ── Grants: app reads; backend/pipeline write the nightly snapshot (#382) ─────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON quota, forecast_snapshot TO "mgid-imperioncrm-web-prd";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON quota, forecast_snapshot TO "mgid-imperioncrmpipeline";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON quota, forecast_snapshot TO "mgid-imperioncrmbackendfunction";
  END IF;
END $$;

COMMIT;
