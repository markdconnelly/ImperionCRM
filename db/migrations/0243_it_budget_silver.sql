-- 0243: `it_budget` silver — Celeste's vCIO per-client IT budget / forecast (persisted).
-- (#1688, epic #1396 — Celeste operator-readiness; the persistence half of the hybrid call).
-- 08-H it-budget-planning drafts a client IT budget + forward forecast, but today it
-- EVAPORATES after the run (a Postgres run-row, Layer 4). A vCIO budget that must persist,
-- version, and be referenced across QBRs needs a real store. This is the dedicated tabular
-- silver entity for it (Mark's hybrid decision: the ASP / vCIO roadmap / risk-register
-- persist as workspace-as-SoR documents (A8); the IT BUDGET is tabular/numeric → its own
-- silver entity, here).
--
-- NOT the Finance `budget` (#1718): that is Imperion's OWN company operating plan (FP&A,
-- `financial`, Audrey). THIS is a per-CLIENT IT spend advisory Celeste produces as vCIO —
-- distinct subject, distinct owner, `client_pii`.
--
-- Migration number 0243 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against a placeholder; the rebased branch takes the next free number just before
-- squash. If another migration merges during the CI window, renumber this file + every
-- reference (the OKF concept, the coverage-matrix row, the PR body).
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B). Real persisted rows;
-- one line per account × period × category × scenario carrying a planned + forecast amount.
-- Celeste's 08-H PROPOSES the lines (parked recommendation, NO-COMMITS — spend never
-- committed); a backend it-budget persist executor writes them (approval-gated, server-side,
-- never a direct silver write). Cost figures still arrive as an Audrey read-only handoff —
-- Celeste reads no Imperion financials directly.
--
-- data_class CLIENT_PII (always-gate) — per-client advisory spend figures. Seeds NOTHING.
--
-- New silver entity → a NEW OKF concept file (docs/database/semantic-layer/tables/it_budget.md)
-- + a coverage-matrix row in THIS PR (system CLAUDE.md §11; semantic-layer gate). Frontend-owned
-- schema (ADR-0042). Additive + idempotent + transactional. No row-level PII values, no secrets.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply Mark-gated, §10.3).

BEGIN;

-- ── it_budget_category: the IT spend category of a budget line ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'it_budget_category') THEN
    CREATE TYPE it_budget_category AS ENUM (
      'hardware', 'software', 'licensing', 'managed_services', 'professional_services',
      'security', 'connectivity', 'cloud', 'contingency', 'other'
    );
  END IF;
END $$;

-- ── it_budget_scenario: which planning scenario this line belongs to ───────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'it_budget_scenario') THEN
    CREATE TYPE it_budget_scenario AS ENUM ('base', 'conservative', 'aggressive');
  END IF;
END $$;

-- ── it_budget_status: the advisory lifecycle of the budget line ────────────────────────────
-- draft (being assembled) → proposed (parked recommendation to a human) → approved (a human
-- accepted it — NOT a spend commitment, just the advisory baseline) → superseded.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'it_budget_status') THEN
    CREATE TYPE it_budget_status AS ENUM ('draft', 'proposed', 'approved', 'superseded');
  END IF;
END $$;

-- ── it_budget_source: provenance of the figure (signal vs inference) ───────────────────────
-- roadmap (derived from the client's strategic roadmap), audry_handoff (an Audrey read-only
-- cost figure), curated (a human set it). Always recorded.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'it_budget_source') THEN
    CREATE TYPE it_budget_source AS ENUM ('roadmap', 'audrey_handoff', 'curated');
  END IF;
END $$;

-- ── it_budget: the per-client vCIO IT budget / forecast line ───────────────────────────────
CREATE TABLE IF NOT EXISTS it_budget (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,    -- the client
  period_start      date NOT NULL,                                             -- the budget period
  period_end        date,
  category          it_budget_category NOT NULL,
  scenario          it_budget_scenario NOT NULL DEFAULT 'base',
  line_item         text,                                                      -- short description (NOT pii): 'firewall refresh', 'M365 E5 true-up'
  planned_amount    numeric(14,2) NOT NULL DEFAULT 0,                          -- the planned spend
  forecast_amount   numeric(14,2),                                            -- the forward forecast (nullable)
  currency          text NOT NULL DEFAULT 'USD',
  status            it_budget_status NOT NULL DEFAULT 'draft',
  source            it_budget_source NOT NULL DEFAULT 'roadmap',
  as_of             timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- One line per account × period × category × scenario (upsert key; revisions via as_of/status).
  CONSTRAINT it_budget_line_uniq UNIQUE (account_id, period_start, category, scenario)
);
COMMENT ON TABLE it_budget IS
  'App-native per-client vCIO IT budget/forecast (#1688, epic #1396): one line per account × period × category × scenario with a planned + forecast amount. Celeste''s 08-H PROPOSES the lines (parked recommendation, NO-COMMITS — spend never committed); a backend it-budget persist executor writes them (approval-gated, never a direct silver write). NOT the Finance company budget (#1718, Imperion''s own FP&A plan) — this is a per-CLIENT advisory. Cost figures arrive as an Audrey read-only handoff. Archetype B (app-native single-SoR), CLIENT_PII data_class (always-gate) — holds per-client spend figures at runtime, seeds none. Migration 0243 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_it_budget_account  ON it_budget (account_id);
CREATE INDEX IF NOT EXISTS idx_it_budget_period   ON it_budget (period_start);
CREATE INDEX IF NOT EXISTS idx_it_budget_status   ON it_budget (status);

-- ── updated_at trigger (the 0210/0223/0227/0237 convention) ────────────────────────────────
DROP TRIGGER IF EXISTS trg_it_budget_updated ON it_budget;
CREATE TRIGGER trg_it_budget_updated BEFORE UPDATE ON it_budget
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: web reads (render); backend reads+writes (the it-budget persist executor,
--    approval-gated, never a direct silver write); pipeline + local-pipeline read. Defensive
--    (roles may be absent), mirroring 0237's block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON it_budget TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON it_budget TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON it_budget TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON it_budget TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
