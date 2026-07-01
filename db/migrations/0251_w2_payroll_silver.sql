-- 0251: employee / W-2 payroll silver model — employee_profile HR-core extension +
-- payroll_run + pay_statement mirrors (#1621, epic #1534 — $100M gap-fill Cluster 3,
-- un-defer W-2 payroll; gates 10-H11 W-2 payroll / 10-H9 comp & benefits).
--
-- Migration number 0251 is ASSIGNED for the coordinated #1534 schema batch (system CLAUDE.md
-- §10.3 — verify no collision at merge; renumber the later-merged file if two 0251s land).
--
-- EMPLOYEE = employee_profile EXTENDED, NOT a new `employee` table. The issue sketches a
-- silver `employee` (HR core); that entity ALREADY EXISTS as `employee_profile` (mig 0085,
-- ADR-0082) — the deliberate 1:1 comp-sensitive sidecar on `app_user` (the Entra-mirrored
-- identity), already carrying the W2|1099 classification and paired with the effective-dated
-- `pay_rate`. A second employee table would be entity sprawl over the same person (the
-- ar_item anti-pattern, 0241). So the HR core lands as ADDITIVE columns on employee_profile:
-- hire/termination dates, job title, and the QBO **Payroll employee** mapping id (distinct
-- from the 1099 vendor id already there).
--
-- PAYROLL IS AN EXTERNAL-SoR MIRROR (archetype B — the `invoice`/0241 discipline). The
-- payroll provider (QBO Payroll / ADP-class) computes statutory tax and IS the system of
-- record for the pay run (10-H11 A9a; ADR-0123 finance read-only — the app never moves
-- money). Imperion MIRRORS the run (payroll_run) and its per-employee statements
-- (pay_statement) and RECONCILES read-back: expected pay (approved hours ×
-- effective pay_rate, via timesheet_payroll_status 0087) vs the statement gross. The
-- reconciliation VERDICT is a derived read-model / backend process (the 0090 expense
-- precedent), NOT a third silver table here.
--
-- WHAT THIS IS NOT:
--   * NOT a payroll engine. No tax math, no pay computation, no money movement in-app.
--   * NOT an agent write target. The 10-H11 run is propose-only: the draft/approval lives
--     on the action plane (agent_pending_action + the B6 MONEY GATE, always_gate class-1,
--     dial-proof forever); actuation submits to the PROVIDER, and the mirror is then
--     re-populated from the provider read-back (A9c) by the ingestion plane.
--   * NOT the leave/PTO accrual store (10-H5) — filed as a follow-up issue (see PR body).
--
-- SECURITY / RLS (⚠ FLAGGED FOR MARK — comp PII; review the role design BEFORE any prod
-- apply, per #1621 acceptance):
--   * data_class: payroll_run + pay_statement are **financial** (0175 taxonomy: "money:
--     invoices, pay, expense" — always_gate on the action plane, #1036 ceiling). The
--     employee_profile HR core stays **people_hr** (the existing matrix row).
--   * FIRST class-literal RLS on a silver table: both payroll tables get ROW LEVEL
--     SECURITY with the third-axis predicate app_data_class_allowed('financial') (0175)
--     gating the WEB role — finance/admin roles only, fail-closed when app.groups is
--     unset. Pipelines (the mirror writers) and the backend (the reconciliation reader)
--     get process-identity policies (they are non-interactive service planes; the
--     agent-layer control is Audrey's salary non-disclosure REFUSAL-CLASS — pay rates are
--     used in reconciliation math, never disclosed — plus the B6 money gate).
--   * Grants (ADR-0127 least-priv; web minimal): web SELECT ONLY (render the payroll
--     surface to payroll-role users; the app NEVER writes payroll). Backend SELECT ONLY
--     (ground/compute/reconcile). Pipelines (cloud + local, LP↔cloud parity)
--     SELECT/INSERT/UPDATE — idempotent replace-from-source mirror merge. Pipelines also
--     gain column-level SELECT on the new quickbooks_employee_id MAPPING column (join
--     key), NEVER the comp values on pay_rate (the 0085 posture, unchanged).
--
-- New silver entities → OKF concept files (employee_profile + payroll_run + pay_statement)
-- + coverage-matrix rows + index rows in the SAME PR (system CLAUDE.md §11 / ADR-0086).
-- Frontend-owned schema (ADR-0042). Additive + idempotent + transactional. No row data, no
-- secrets seeded. 💤 DORMANT — NOT prod-applied until Mark reviews the RLS/role design and
-- runs it (each prod apply is Mark-gated).

BEGIN;

-- ── 1. employee_profile: the HR core lands on the EXISTING employee entity (0085) ────────
ALTER TABLE employee_profile
  ADD COLUMN IF NOT EXISTS hire_date        date,
  ADD COLUMN IF NOT EXISTS termination_date date,   -- NULL while employed; pairs with is_active
  ADD COLUMN IF NOT EXISTS job_title        text,
  -- QBO **Payroll employee** id — the W-2 twin of quickbooks_vendor_id (1099/AP). Resolved
  -- by email like the other mappings (ADR-0082 §Employees). Mapping column, NOT comp data.
  ADD COLUMN IF NOT EXISTS quickbooks_employee_id text;

COMMENT ON COLUMN employee_profile.hire_date IS
  'HR core (#1621). Employment start; people_hr data — payroll/HR-gated in the app layer.';
COMMENT ON COLUMN employee_profile.termination_date IS
  'HR core (#1621). NULL while employed. A former employee keeps history (is_active=false), never deleted.';
COMMENT ON COLUMN employee_profile.quickbooks_employee_id IS
  'Mapping column (#1621) — the QBO Payroll EMPLOYEE id (W-2), distinct from quickbooks_vendor_id (1099/AP). Joins pay_statement ingestion to the employee; NOT comp data — pipelines may read it.';

CREATE INDEX IF NOT EXISTS idx_employee_profile_qb_employee
  ON employee_profile (quickbooks_employee_id) WHERE quickbooks_employee_id IS NOT NULL;

-- ── 2. payroll_run: one provider pay run (period + pay date + run totals) ────────────────
CREATE TABLE IF NOT EXISTS payroll_run (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The external SoR. 'qbo_payroll' first; ADP-class providers are a data change.
  provider     text NOT NULL DEFAULT 'qbo_payroll',
  -- Provider run id. If a provider exposes no run id, ingestion synthesizes a
  -- deterministic key (e.g. '<pay_date>:<period_start>') so the upsert stays idempotent.
  external_id  text NOT NULL,
  period_start date NOT NULL,
  period_end   date NOT NULL,
  pay_date     date NOT NULL,
  run_type     text NOT NULL DEFAULT 'regular'
                 CHECK (run_type IN ('regular','off_cycle','correction')),
  status       text,                       -- provider status mirrored as-is (no app lifecycle)
  -- Run totals as reported by the provider (mirror discipline: never recomputed in-app).
  total_gross          numeric(14,2),
  total_net            numeric(14,2),
  total_employee_taxes numeric(14,2),
  total_employer_taxes numeric(14,2),
  total_deductions     numeric(14,2),
  currency     text NOT NULL DEFAULT 'USD',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payroll_run_provider_uniq UNIQUE (provider, external_id),
  CONSTRAINT payroll_run_period CHECK (period_end >= period_start)
);
COMMENT ON TABLE payroll_run IS
  'Silver W-2 payroll run — read-only MIRROR of the external payroll provider (QBO Payroll / ADP-class), #1621 / 10-H11 (ADR-0123 finance read-only; ADR-0082 W-2 model un-deferred). One row per provider pay run: period, pay date, provider status, run totals as reported. The app NEVER computes tax or moves money (A9a); the propose/approve draft lives on the action plane behind the B6 MONEY GATE (always_gate, dial-proof), and the mirror is populated from the provider read-back by the ingestion plane (idempotent upsert on provider+external_id, A9b). data_class FINANCIAL; RLS third-axis gated (0175) — web reads are finance/admin only; comp values never echoed to non-payroll context. Migration 0251 (#1534 batch).';

CREATE INDEX IF NOT EXISTS idx_payroll_run_pay_date ON payroll_run (pay_date DESC);

DROP TRIGGER IF EXISTS trg_payroll_run_updated ON payroll_run;
CREATE TRIGGER trg_payroll_run_updated BEFORE UPDATE ON payroll_run
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. pay_statement: one employee's statement within a run (gross/net/withholding) ──────
CREATE TABLE IF NOT EXISTS pay_statement (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id  uuid NOT NULL REFERENCES payroll_run(id) ON DELETE CASCADE,
  -- RESTRICT: a pay statement is a durable money/audit fact — an identity is deactivated
  -- (employee_profile.is_active=false), never hard-deleted out from under payroll history.
  app_user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  external_id     text,                    -- provider statement/paycheck id (read-back ref)
  gross_pay       numeric(12,2),
  net_pay         numeric(12,2),
  employee_taxes  numeric(12,2),           -- withholding (employee side), provider-computed
  employer_taxes  numeric(12,2),
  pre_tax_deductions  numeric(12,2),
  post_tax_deductions numeric(12,2),
  -- Per-line provider breakdown (benefit/deduction lines, mirrored as-is). Comp-sensitive.
  deduction_detail jsonb,
  regular_hours   numeric(7,2),
  overtime_hours  numeric(7,2),
  pto_hours       numeric(7,2),
  payment_method  text,                    -- e.g. direct_deposit | check (mirrored as-is)
  currency        text NOT NULL DEFAULT 'USD',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- THE A9b IDEMPOTENCY KEY (employee + pay run/period): a retried ingest or actuation
  -- read-back is a no-op upsert — never a double-pay row.
  CONSTRAINT pay_statement_run_employee_uniq UNIQUE (payroll_run_id, app_user_id)
);
COMMENT ON TABLE pay_statement IS
  'Silver per-employee W-2 pay statement within a payroll_run — read-only MIRROR of the external payroll provider (#1621 / 10-H11). Gross/net, provider-computed withholding + employer taxes, deduction breakdown, hours. UNIQUE (payroll_run_id, app_user_id) = the A9b idempotency key (employee + pay period) — a retry is a no-op, never a double pay. Reconciliation (expected pay = approved hours × effective pay_rate via timesheet_payroll_status 0087 vs statement gross) is a backend read-model, not stored here. MOST-SENSITIVE comp data: data_class FINANCIAL, RLS third-axis gated (0175); Audrey salary non-disclosure is REFUSAL-CLASS — per-person figures are used in reconciliation math, never disclosed. Migration 0251 (#1534 batch).';
COMMENT ON COLUMN pay_statement.deduction_detail IS
  'Provider per-line benefit/withholding/deduction breakdown, mirrored as-is (jsonb). Comp-sensitive; never echoed to non-payroll context.';

CREATE INDEX IF NOT EXISTS idx_pay_statement_employee ON pay_statement (app_user_id);
CREATE INDEX IF NOT EXISTS idx_pay_statement_run      ON pay_statement (payroll_run_id);

DROP TRIGGER IF EXISTS trg_pay_statement_updated ON pay_statement;
CREATE TRIGGER trg_pay_statement_updated BEFORE UPDATE ON pay_statement
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. RLS: the third axis on greenfield payroll tables (0175 precedent) ─────────────────
-- Greenfield (no live read path to retrofit — the ADR-0105 rule holds). Web reads pass ONLY
-- when the caller's app.groups roles are granted 'financial' (finance/admin per the 0175
-- seed); fail-closed when unset. Pipelines/backend are process identities (policies below).
-- ⚠ Role design flagged for Mark before prod apply (see header).
ALTER TABLE payroll_run   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_statement ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['payroll_run','pay_statement'] LOOP
    -- Web: class-gated (finance/admin), fail-closed. SELECT-only grant → read policy.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_web_financial', t);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT TO %I USING (app_data_class_allowed(''financial''))',
        t || '_web_financial', t, 'mgid-imperioncrm-web-prd');
    END IF;
    -- Backend: reconciliation/ground reader — non-interactive process identity.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_backend_read', t);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT TO %I USING (true)',
        t || '_backend_read', t, 'mgid-imperioncrmbackendfunction');
    END IF;
    -- Pipelines: the mirror writers (idempotent replace-from-source merge).
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_pipeline_rw', t);
      EXECUTE format(
        'CREATE POLICY %I ON %I TO %I USING (true) WITH CHECK (true)',
        t || '_pipeline_rw', t, 'mgid-imperioncrmpipeline');
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_localpipeline_rw', t);
      EXECUTE format(
        'CREATE POLICY %I ON %I TO %I USING (true) WITH CHECK (true)',
        t || '_localpipeline_rw', t, 'imperion-localpipeline');
    END IF;
  END LOOP;
END $$;

-- ── 5. Grants (ADR-0127 least-priv; defensive — roles may be absent in some envs) ────────
DO $$
BEGIN
  -- Web: SELECT ONLY — render the payroll surface to payroll-role users (RLS + the app
  -- layer gate to finance/admin). The app NEVER writes payroll (provider SoR).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON payroll_run   TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON pay_statement TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grants.';
  END IF;

  -- Backend: SELECT ONLY — 10-H11 ground/compute + the reconciliation read-model. The
  -- actuation writes to the PROVIDER; a backend mirror-write grant, if the executor
  -- design lands that way, is a one-line follow-up data change, not pre-granted here.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON payroll_run   TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON pay_statement TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grants.';
  END IF;

  -- Cloud pipeline: mirror merge writer (LP↔cloud parity — whichever plane ingests the
  -- provider bronze owns its merge; idempotent replace-from-source, dual-run converges).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON payroll_run   TO "mgid-imperioncrmpipeline";
    GRANT SELECT, INSERT, UPDATE ON pay_statement TO "mgid-imperioncrmpipeline";
    GRANT SELECT (app_user_id, autotask_resource_id, quickbooks_vendor_id, quickbooks_employee_id)
      ON employee_profile TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.';
  END IF;

  -- Local pipeline: same (LP pulls QBO today, LP #197 lineage). Mapping columns only on
  -- employee_profile — NEVER classification, NEVER pay_rate (the 0085 posture).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON payroll_run   TO "imperion-localpipeline";
    GRANT SELECT, INSERT, UPDATE ON pay_statement TO "imperion-localpipeline";
    GRANT SELECT (app_user_id, autotask_resource_id, quickbooks_vendor_id, quickbooks_employee_id)
      ON employee_profile TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
