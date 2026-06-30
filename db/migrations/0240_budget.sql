-- 0240: `budget` silver — the human-authored, AGENT-READ-ONLY company operating plan
-- (#1718, epic #1394 — Audrey FP&A expansion, decision D2/D3/D5).
-- The internal operating plan Audrey reads to compute plan-vs-actual variance: one row per
-- account × period × category × scenario, with a planned amount. This is the PLAN side that
-- budget-variance (#1721) and cash-flow-forecast (#1722) tie actuals out against. Versioned +
-- point-in-time auditable (effective_from/effective_to), the brand_asset (#1699) pattern.
--
-- THE CRITICAL INVARIANT (D5 / ADR-0123): **no agent ever writes this table.** Finance is
-- READ-ONLY; QBO owns money movement. There is NO agent write path, NO autonomous-action kind,
-- ever — agents ONLY read the plan. The invariant is enforced at the GRANT layer below: every
-- role, INCLUDING the backend/agent runtime, gets SELECT only; no role gets INSERT/UPDATE/DELETE
-- in this migration. The human populate surface (a finance-admin GUI / seed, a future
-- write-bearing role) is the ONLY write path, a follow-up, and is deliberately NOT granted here.
--
-- Migration number 0240 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before squash. If
-- another migration merges during the CI window, renumber this file + every reference.
--
-- ARCHETYPE: app-native, human-curated single-source-of-record silver (archetype B). Real
-- persisted rows with a uuid PK. No FKs out — a standalone plan registry, referenced read-only
-- (it joins to actuals only inside read-models, by account/period text keys, never via a FK).
--
-- New silver entity → a NEW OKF concept file (docs/database/semantic-layer/tables/budget.md)
-- + a coverage-matrix row in THIS PR (system CLAUDE.md §11; semantic-layer gate). Frontend-owned
-- schema (ADR-0042). Additive + idempotent + transactional. No PII (an operating plan, not
-- personal — individual pay rates live in payroll-scoped time facts, never here). No secrets.
-- data_class FINANCIAL.
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply Mark-gated, §10.3).

BEGIN;

-- ── budget_category: the operating-plan line categories ───────────────────────────────────
-- An ENUM so the finance-admin populate surface + budget-variance + cash-flow-forecast share
-- one vocabulary for what kind of plan line a row is (the money-flow shape of #1307).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_category') THEN
    CREATE TYPE budget_category AS ENUM (
      'revenue', 'cogs', 'opex', 'capex', 'headcount', 'other'
    );
  END IF;
END $$;

-- ── budget_grain: the period granularity of a plan row ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_grain') THEN
    CREATE TYPE budget_grain AS ENUM ('month', 'quarter', 'year');
  END IF;
END $$;

-- ── budget: human-authored, agent-read-only company operating plan ────────────────────────
CREATE TABLE IF NOT EXISTS budget (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The plan account / GL line label (e.g. 'Revenue:Recurring', 'OpEx:Payroll'). Text, not a
  -- FK — the plan is authored at whatever account grain finance keeps; actuals join by this key
  -- inside read-models only.
  account         text NOT NULL,
  category        budget_category NOT NULL,
  -- The plan period. `period_start` is the first day of the period; `grain` says how wide it is.
  period_start    date NOT NULL,
  grain           budget_grain NOT NULL DEFAULT 'month',
  -- The planned amount for this account × period (the PLAN side of plan-vs-actual).
  amount          numeric(14,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'USD',
  -- A named plan version: 'plan' (the approved operating budget), or a labeled re-plan. NOTE:
  -- this is human-authored plan scenarios ONLY — an agent-DERIVED forecast is NEVER written here
  -- (D3: a forecast is a transparent read-model projection, not a persisted truth).
  scenario        text NOT NULL DEFAULT 'plan',
  fiscal_year     int,
  version         int  NOT NULL DEFAULT 1,
  effective_from  date,
  effective_to    date,                                  -- null = currently effective; point-in-time auditable
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE budget IS
  'Human-authored, AGENT-READ-ONLY company operating plan (#1718, epic #1394 D2/D5): one row per account × period_start × category × scenario with a planned amount — the PLAN side budget-variance + cash-flow-forecast tie actuals out against. Versioned + effective_from/to for point-in-time audit. NO agent write path EVER — finance is READ-ONLY, QBO owns money (ADR-0123); every role (incl. backend/agent runtime) has SELECT only; the human finance-admin populate surface is the ONLY write path, deliberately NOT granted here. An agent-derived forecast is never persisted here (D3). Archetype B (app-native, human-curated), FINANCIAL data_class. No PII (no individual pay rates — those stay in payroll-scoped time facts), no secrets. Migration 0240 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_budget_account       ON budget (account);
CREATE INDEX IF NOT EXISTS idx_budget_period_start  ON budget (period_start);
CREATE INDEX IF NOT EXISTS idx_budget_category      ON budget (category);
CREATE INDEX IF NOT EXISTS idx_budget_scenario      ON budget (scenario);

-- ── updated_at trigger (the 0210/0223/0238 convention) ────────────────────────────────────
DROP TRIGGER IF EXISTS trg_budget_updated ON budget;
CREATE TRIGGER trg_budget_updated BEFORE UPDATE ON budget
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: SELECT ONLY to EVERY role — the D5 read-only invariant enforced at the grant ──
-- This is the KEY part of the migration. No role gets INSERT/UPDATE/DELETE: agents (the backend
-- runtime) READ the operating plan, they NEVER write it (ADR-0123, finance is read-only).
-- Defensive (roles may be absent), mirroring 0238's brand_asset block.
--
-- The human finance-admin populate surface (a future write-bearing role / seed) is the ONLY
-- write path and is deliberately NOT granted here.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON budget TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  -- D5/ADR-0123: backend = the agent runtime. SELECT ONLY — agents read the plan, never write it.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON budget TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON budget TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON budget TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
