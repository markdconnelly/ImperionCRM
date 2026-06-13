-- 0085: Employee comp store — employee_profile + effective-dated pay_rate
-- (ADR-0082, issue #461). First of the three time-tracking schema migrations
-- (0085 comp/mapping → 0086 attendance/timesheet/silver → 0087 time_ticket/recon).
--
-- ADR-0082 introduces employee time tracking. An Employee is an existing app_user
-- (the Entra-mirrored identity, ADR-0016) EXTENDED for time tracking. The extension
-- is deliberately a SEPARATE store, not new columns on app_user, because it carries
-- the highest-sensitivity data this feature adds — compensation. Two tables:
--   1. employee_profile (1:1 sidecar on app_user): the Employee Classification
--      (1099|W2; v1 all 1099) plus the external-id mappings that let the three time
--      signals join — an Autotask Resource id (attributes Ticket Time Entries) and a
--      QuickBooks vendor/employee id (matches payments). Both auto-resolve by the
--      employee's email — the consistent join key across all three systems — and the
--      resolved id is stored for stability + audit (ADR-0082 §Employees).
--   2. pay_rate: the effective-dated compensation rate. A Timesheet reconciles
--      against the rate in force that week (latest effective_from <= week start).
--      v1 is hourly-1099 (paid straight, gross=net); the salaried/overtime columns
--      are modeled but DORMANT until the first W2 hire.
--
-- Security (ADR-0082 §Security impact): comp data is payroll-role-gated. It NEVER
-- lives on the Entra-synced app_user row, is NEVER visible to the employee
-- themselves / agents / any client surface, and the DB grants below give the pay_rate
-- (the comp itself) to the web role (app-gated to finance/admin via canApprovePayroll)
-- and the backend reconciliation process ONLY. The pipelines get column-level SELECT
-- on the employee_profile MAPPING columns only (so the silver merge can join an
-- Autotask Resource → employee), NEVER the classification. No prod comp values exist
-- yet. Additive, idempotent, transactional. Frontend-owned schema (ADR-0042).
-- NOT prod-applied until Mark runs it. No secrets.

BEGIN;

-- ── employee_profile: the 1:1 time-tracking + mapping extension of app_user ────
-- PK = app_user_id makes the 1:1 explicit and CASCADE-cleans if an identity is
-- removed. classification drives the expected-pay math and which QuickBooks record
-- is authoritative (1099 = vendor/AP payment; W2 = payroll record, dormant).
CREATE TABLE IF NOT EXISTS employee_profile (
  app_user_id          uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  classification       text NOT NULL DEFAULT '1099'
                         CHECK (classification IN ('1099','W2')),   -- v1: all 1099
  -- External-id mappings (resolved by email, ADR-0082). NULL until the mapping UI
  -- (#468) or an auto-resolve confirms them. Autotask Resource id is numeric; the
  -- QuickBooks Online vendor/employee id is an opaque string.
  autotask_resource_id   bigint,
  quickbooks_vendor_id   text,
  -- Mapping audit: when the email-resolve last ran and who confirmed it once.
  mappings_resolved_at   timestamptz,
  mappings_confirmed_by  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  is_active            boolean NOT NULL DEFAULT true,   -- a former employee keeps history
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE employee_profile IS
  'Time-tracking extension of app_user (ADR-0082): Employee Classification (1099|W2) + the Autotask Resource / QuickBooks vendor mappings that join the three time signals (resolved by email). Payroll-role-gated comp data — kept off the Entra-synced app_user row, never employee/agent/client-visible.';
COMMENT ON COLUMN employee_profile.classification IS
  'Comp-sensitive (ADR-0082). 1099 = paid hourly straight, gross=net, QuickBooks vendor/AP payment (v1). W2 = withholding + payroll record + overtime (modeled, dormant).';
COMMENT ON COLUMN employee_profile.autotask_resource_id IS
  'Mapping column — the pipelines may read this to attribute Autotask Ticket Time Entries to the employee; NOT comp data.';

CREATE INDEX IF NOT EXISTS idx_employee_profile_active ON employee_profile (is_active) WHERE is_active;
-- The mapping lookups the silver merge / payroll match use (partial: only resolved rows).
CREATE INDEX IF NOT EXISTS idx_employee_profile_autotask  ON employee_profile (autotask_resource_id) WHERE autotask_resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_profile_quickbooks ON employee_profile (quickbooks_vendor_id) WHERE quickbooks_vendor_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_employee_profile_updated ON employee_profile;
CREATE TRIGGER trg_employee_profile_updated BEFORE UPDATE ON employee_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── pay_rate: effective-dated compensation (the comp itself) ───────────────────
-- A new row supersedes the prior one from its effective_from; the reconcile picks
-- the row with the greatest effective_from <= the Timesheet's week start. History is
-- never overwritten (audit + back-period reconciliation), so this is append-mostly.
CREATE TABLE IF NOT EXISTS pay_rate (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  effective_from date NOT NULL,                          -- inclusive; rate in force from this date
  -- v1 1099-hourly: the straight hourly rate (no overtime). USD; multi-currency is
  -- out of v1 (no currency column — add via ADR if/when needed).
  rate_kind      text NOT NULL DEFAULT 'hourly'
                   CHECK (rate_kind IN ('hourly','salaried')),   -- salaried = W2, dormant
  hourly_rate    numeric(12,2),
  -- W2-dormant fields (modeled now, unused in v1):
  salaried_annual    numeric(12,2),                      -- annual salary when rate_kind='salaried'
  overtime_multiplier numeric(4,2) NOT NULL DEFAULT 1.5, -- FLSA 1.5x >40h (W2 only)
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES app_user(id) ON DELETE SET NULL,  -- who set the rate (audit)
  -- One rate per employee per effective date.
  UNIQUE (app_user_id, effective_from),
  -- An hourly rate must carry hourly_rate; a salaried one must carry salaried_annual.
  CONSTRAINT pay_rate_kind_amount CHECK (
    (rate_kind = 'hourly'   AND hourly_rate IS NOT NULL)
    OR (rate_kind = 'salaried' AND salaried_annual IS NOT NULL)
  )
);
COMMENT ON TABLE pay_rate IS
  'Effective-dated Employee Pay Rate (ADR-0082) — the comp figure. A Timesheet reconciles against the rate in force that week (greatest effective_from <= week start). v1 hourly-1099; salaried/overtime columns dormant until W2. Most-sensitive comp data: web (app-gated finance/admin) + backend reconciliation read only.';

-- The reconcile lookup: latest rate <= a given week, per employee.
CREATE INDEX IF NOT EXISTS idx_pay_rate_employee_effective ON pay_rate (app_user_id, effective_from DESC);

-- ── Grants (0082/0084 defensive pattern; roles may be absent in some envs) ─────
-- Least-privilege for comp data (ADR-0082 §Security):
--   • web (GUI): RW both — the mapping/rate UI (#468) writes them; app-layer gates
--     visibility to finance/admin (canApprovePayroll). One MI role, so the
--     finance/admin gate is enforced in app code, not the DB grant.
--   • backend: SELECT both — the payroll reconciliation process computes expected pay
--     (approved hours × effective rate) and resolves mappings server-side.
--   • pipelines (cloud + local): COLUMN-level SELECT on employee_profile MAPPING
--     columns ONLY — the bronze→silver time_record merge joins an Autotask Resource
--     to an employee. They get NO access to classification and NO access to pay_rate.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE ON employee_profile TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE ON pay_rate         TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON employee_profile TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON pay_rate         TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  -- Cloud pipeline (silver merge): mapping columns only — never classification/comp.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT (app_user_id, autotask_resource_id, quickbooks_vendor_id) ON employee_profile
      TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline mapping grant.';
  END IF;

  -- Local pipeline (scheduled Autotask TimeEntry / QBO pull): same mapping-only read.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT (app_user_id, autotask_resource_id, quickbooks_vendor_id) ON employee_profile
      TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline mapping grant.';
  END IF;
END $$;

COMMIT;
