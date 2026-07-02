-- 0253: sales-commission / comp-plan silver model (#1650, epic #1534 — gap-fill OP-02-C3,
-- Stream 02: calculate sales commissions & issue statements).
--
-- Migration number 0253 is ASSIGNED for the coordinated 11-PR schema batch (claimed per system
-- CLAUDE.md §10.3 — if another migration lands on this number during the CI window, renumber this
-- file + every in-file reference at rebase; rename is data-safe).
--
-- THE MODEL (issue #1650): three app-native silver entities + one child table.
--   * commission_plan (+ commission_plan_tier) — the human-authored comp plan per rep: base rate,
--     rate tiers with accelerators (tier rows), and a draw (recoverable or not). Effective-dated,
--     the `budget` (0240) human-curated pattern.
--   * commission_attainment — the attainment INPUT per plan × period, derived from the sales
--     pipeline (closed-won `opportunity` rows) against `quota` (0114). Written by the backend
--     compute procedure, stored (not just computed at read) so a statement's input is auditable
--     as-of computation.
--   * commission_statement — the period statement: computed amounts, then the approve → pay
--     lifecycle. status: draft → computed → approved → paid (+ void for correction).
--
-- MONEY-GATE (decision B6 / ADR-0128 ladder): COMPUTE is auto — the backend procedure derives
-- attainment and writes a computed statement without a gate. PAYOUT is ALWAYS_GATE — a human
-- approves every statement (approved_by/approved_at), and the actual money movement happens in
-- payroll/QBO (ADR-0123: QBO owns money; finance mirrors are read-only). `paid` here is a
-- RECORD of an external payout (paid_ref), never a payment instruction. No app→QBO write path.
--
-- PROPOSE-ONLY / DORMANT (ADR-0136 A5c): the acting procedure ships dormant; this schema is the
-- substrate. DORMANT — NOT prod-applied until the orchestrator/Mark runs it (prod apply Mark-gated).
--
-- ARCHETYPE: B (app-native, human-curated plan) for commission_plan/_tier; C (process-computed
-- fact) for commission_attainment and commission_statement. data_class FINANCIAL — and
-- COMPENSATION-SENSITIVE (per-employee pay terms; the `mileage_rate` comp-gated posture). No
-- client PII; owner references are internal `app_user` FKs, no client identifiers.
--
-- GRANTS (least-priv, ADR-0127; SELECT-default + explicit write allowlist):
--   * commission_plan / commission_plan_tier: WEB gets SELECT/INSERT/UPDATE (human comp-admin
--     authoring surface); BACKEND/agent runtime gets SELECT ONLY — agents READ the plan, they
--     never author compensation terms.
--   * commission_attainment / commission_statement: BACKEND gets SELECT/INSERT/UPDATE (the
--     compute procedure writes attainment + statements; the human approve/pay marks are executed
--     by the backend after the always_gate, §1 — every process calls the backend); WEB gets
--     SELECT ONLY (renders statements; approval is a process, not a direct DB write).
--   * NO role gets DELETE — comp records are a financial audit trail; corrections are `void`.
--   * Pipelines get NOTHING — deliberately: no bronze→silver merge feeds these app-native tables
--     (attainment derives from silver `opportunity`/`quota` in the backend, not from a source
--     mirror). Defensive IF EXISTS blocks (roles may be absent), the 0240/0241 convention.
--
-- New silver entities → NEW OKF concept files (docs/database/semantic-layer/tables/
-- commission_plan.md, commission_attainment.md, commission_statement.md) + coverage-matrix rows
-- + index.md in the SAME PR (system CLAUDE.md §11 / ADR-0086; semantic-layer gate). Frontend-owned
-- schema (ADR-0042). Additive + idempotent + transactional. No secrets, no row data in docs.

BEGIN;

-- ── commission_basis: what the rate applies to ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_basis') THEN
    CREATE TYPE commission_basis AS ENUM ('revenue', 'gross_margin', 'bookings');
  END IF;
END $$;

-- ── commission_statement_status: the statement lifecycle ───────────────────────────────────
-- draft → computed (auto, B6) → approved (ALWAYS_GATE, human) → paid (record of external
-- payroll/QBO payout). void = correction terminal state (no DELETE anywhere in this model).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_statement_status') THEN
    CREATE TYPE commission_statement_status AS ENUM
      ('draft', 'computed', 'approved', 'paid', 'void');
  END IF;
END $$;

-- ── commission_plan: human-authored comp plan per rep ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_plan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  -- The rep on the plan (internal identity, ADR-0016). A plan is per-person — team/pool plans
  -- are out of scope until a real one exists (YAGNI; quota's owner-XOR-team precedent noted).
  owner_user_id   uuid REFERENCES app_user(id) ON DELETE SET NULL,
  basis           commission_basis NOT NULL DEFAULT 'revenue',
  -- Base commission rate as a FRACTION (0.0500 = 5%). Tier rows override per attainment band;
  -- this is the rate when no tier matches (or the plan has no tiers).
  base_rate       numeric(7,4) NOT NULL CHECK (base_rate >= 0),
  -- Draw: a periodic advance against future commissions. recoverable = clawed back from later
  -- statements (draw_applied); non-recoverable = a guaranteed floor.
  draw_amount     numeric(14,2) NOT NULL DEFAULT 0 CHECK (draw_amount >= 0),
  draw_recoverable boolean NOT NULL DEFAULT true,
  currency        text NOT NULL DEFAULT 'USD',
  effective_from  date NOT NULL,
  effective_to    date,                                  -- null = currently effective
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_plan_effective_order
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
COMMENT ON TABLE commission_plan IS
  'Human-authored sales comp plan per rep (#1650, epic #1534, OP-02-C3): base rate + draw, with rate tiers/accelerators in commission_plan_tier. Effective-dated (effective_to IS NULL = current). Archetype B (app-native, human-curated); FINANCIAL + compensation-sensitive data_class (comp-gated like mileage_rate). Agents READ the plan, never author it — web comp-admin surface is the only write path (ADR-0127 allowlist); no DELETE for any role. Money-gate B6: compute auto, payout always_gate (see commission_statement). Migration 0253.';
COMMENT ON COLUMN commission_plan.base_rate IS
  'Commission rate as a fraction of the basis amount (0.0500 = 5%). Applied when no commission_plan_tier band matches.';
COMMENT ON COLUMN commission_plan.draw_recoverable IS
  'true = draw is an advance recovered from later statements (statement.draw_applied); false = guaranteed non-recoverable floor.';

CREATE INDEX IF NOT EXISTS idx_commission_plan_owner ON commission_plan (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_commission_plan_effective
  ON commission_plan (effective_from, effective_to);

DROP TRIGGER IF EXISTS trg_commission_plan_updated ON commission_plan;
CREATE TRIGGER trg_commission_plan_updated BEFORE UPDATE ON commission_plan
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── commission_plan_tier: rate bands / accelerators over quota attainment ──────────────────
-- A tier applies its rate to the basis when period attainment falls in [attainment_min,
-- attainment_max). rate > base_rate above 100% attainment = an accelerator.
CREATE TABLE IF NOT EXISTS commission_plan_tier (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES commission_plan(id) ON DELETE CASCADE,
  -- Attainment band bounds as FRACTIONS of quota (1.0000 = 100% attainment). max NULL = unbounded.
  attainment_min  numeric(7,4) NOT NULL CHECK (attainment_min >= 0),
  attainment_max  numeric(7,4),
  rate            numeric(7,4) NOT NULL CHECK (rate >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_plan_tier_band_order
    CHECK (attainment_max IS NULL OR attainment_max > attainment_min),
  -- One band per lower bound per plan (the compute procedure picks the band containing attainment).
  CONSTRAINT commission_plan_tier_uniq UNIQUE (plan_id, attainment_min)
);
COMMENT ON TABLE commission_plan_tier IS
  'Rate tier / accelerator band of a commission_plan (#1650): rate applied when period attainment ∈ [attainment_min, attainment_max) (fractions of quota; max NULL = unbounded; rate above base past 100% = accelerator). Child of commission_plan (CASCADE); same comp-gated FINANCIAL posture and grants. Migration 0253.';

CREATE INDEX IF NOT EXISTS idx_commission_plan_tier_plan ON commission_plan_tier (plan_id);

DROP TRIGGER IF EXISTS trg_commission_plan_tier_updated ON commission_plan_tier;
CREATE TRIGGER trg_commission_plan_tier_updated BEFORE UPDATE ON commission_plan_tier
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── commission_attainment: the per-period attainment INPUT (from pipeline/quota) ───────────
-- Backend-computed from silver facts: actual = credited closed-won opportunity value in the
-- period; quota_amount = the quota (0114) in force. Persisted (not read-computed) so each
-- statement's input is auditable exactly as it stood at computation.
CREATE TABLE IF NOT EXISTS commission_attainment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES commission_plan(id),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  -- The quota.amount in force for the owner/period at computation (nullable — a plan can pay on
  -- pure revenue share with no quota; attainment is then NULL and only base_rate applies).
  quota_amount    numeric(14,2),
  -- Credited basis amount in the period (closed-won per plan.basis) — the pipeline-side input.
  actual_amount   numeric(14,2) NOT NULL DEFAULT 0,
  -- actual / quota as a fraction (1.0000 = 100%), stored as-of computation for band selection.
  attainment      numeric(7,4),
  source          text NOT NULL DEFAULT 'pipeline',  -- provenance of actual_amount (opportunity closed-won)
  computed_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_attainment_period_order CHECK (period_end >= period_start),
  -- One attainment row per plan × period — recompute updates in place (idempotent upsert key).
  CONSTRAINT commission_attainment_uniq UNIQUE (plan_id, period_start, period_end)
);
COMMENT ON TABLE commission_attainment IS
  'Per-period attainment INPUT for a commission_plan (#1650): actual credited closed-won (from silver opportunity, per plan.basis) vs the quota (0114) in force, with the attainment fraction stored as-of computation so statement math is auditable. Archetype C (process-computed): the BACKEND compute procedure writes it (auto, money-gate B6 compute side); web reads only; no DELETE. FINANCIAL + comp-gated. Migration 0253.';

CREATE INDEX IF NOT EXISTS idx_commission_attainment_period
  ON commission_attainment (period_start, period_end);

DROP TRIGGER IF EXISTS trg_commission_attainment_updated ON commission_attainment;
CREATE TRIGGER trg_commission_attainment_updated BEFORE UPDATE ON commission_attainment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── commission_statement: the period statement — computed → approved → paid ────────────────
CREATE TABLE IF NOT EXISTS commission_statement (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id           uuid NOT NULL REFERENCES commission_plan(id),
  -- The attainment input the computation used (auditable lineage; nullable for pure-rate plans
  -- computed before an attainment row exists).
  attainment_id     uuid REFERENCES commission_attainment(id),
  period_start      date NOT NULL,
  period_end        date NOT NULL,
  status            commission_statement_status NOT NULL DEFAULT 'draft',
  -- Computed money (B6 auto side): tier-rate × credited basis.
  gross_commission  numeric(14,2),
  -- Recoverable draw clawed back this period (plan.draw_recoverable).
  draw_applied      numeric(14,2) NOT NULL DEFAULT 0,
  net_payable       numeric(14,2),
  currency          text NOT NULL DEFAULT 'USD',
  computed_at       timestamptz,
  -- PAYOUT ALWAYS_GATE (B6): a human approves every statement before anything pays.
  approved_by       uuid REFERENCES app_user(id) ON DELETE SET NULL,
  approved_at       timestamptz,
  -- `paid` is a RECORD of the external payroll/QBO payout (ADR-0123: QBO owns money movement;
  -- no app→QBO write path). paid_ref = the external payroll run / QBO txn reference.
  paid_at           timestamptz,
  paid_ref          text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_statement_period_order CHECK (period_end >= period_start),
  -- One statement per plan × period (recompute updates the draft in place; corrections = void).
  CONSTRAINT commission_statement_uniq UNIQUE (plan_id, period_start, period_end)
);
COMMENT ON TABLE commission_statement IS
  'Sales commission statement per plan × period (#1650, OP-02-C3): draft → computed (AUTO — backend compute, money-gate B6) → approved (ALWAYS_GATE — human approved_by/approved_at) → paid (RECORD of external payroll/QBO payout via paid_ref; QBO owns money movement, ADR-0123 — never a payment instruction) · void = correction terminal (no DELETE for any role). gross_commission = tier rate × credited basis; draw_applied claws back a recoverable draw; net_payable = gross − draw_applied. Archetype C; FINANCIAL + comp-gated. Acting procedure ships DORMANT (ADR-0136 A5c). Migration 0253.';
COMMENT ON COLUMN commission_statement.paid_ref IS
  'External payroll-run / QBO transaction reference for the payout. A record only — money moves in payroll/QBO, never from the app (ADR-0123).';

CREATE INDEX IF NOT EXISTS idx_commission_statement_status
  ON commission_statement (status);
CREATE INDEX IF NOT EXISTS idx_commission_statement_period
  ON commission_statement (period_start, period_end);

DROP TRIGGER IF EXISTS trg_commission_statement_updated ON commission_statement;
CREATE TRIGGER trg_commission_statement_updated BEFORE UPDATE ON commission_statement
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: least-priv (ADR-0127) — comp-gated financial data ──────────────────────────────
-- Plan + tiers: WEB writes (human comp-admin authoring), BACKEND reads (agents never author
-- comp terms). Attainment + statements: BACKEND writes (compute auto + gate-executed approve/
-- pay marks — every process calls the backend, §1), WEB reads only. NO DELETE anywhere
-- (audit trail; corrections = void). Pipelines deliberately ungranted — nothing here is fed by
-- a bronze→silver merge. Defensive IF EXISTS (roles may be absent), the 0240/0241 convention.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    -- Human comp-admin authoring surface: plans + tiers.
    GRANT SELECT, INSERT, UPDATE ON commission_plan, commission_plan_tier
      TO "mgid-imperioncrm-web-prd";
    -- Statements + attainment render read-only in the GUI; approve/pay are backend processes.
    GRANT SELECT ON commission_attainment, commission_statement
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    -- Backend = the agent runtime: READS the comp plan (never authors it) …
    GRANT SELECT ON commission_plan, commission_plan_tier
      TO "mgid-imperioncrmbackendfunction";
    -- … and WRITES the computed facts: attainment (auto) + statements (compute auto; approve/
    -- pay marks executed after the always_gate human approval, B6).
    GRANT SELECT, INSERT, UPDATE ON commission_attainment, commission_statement
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
