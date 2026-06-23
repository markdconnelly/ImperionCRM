-- 0186: company role-scoped RLS — the COMPANY/role axis of two-axis RLS (#979, parent
-- #976 / #967, ADR-0105). Migration number 0186 is a PLACEHOLDER claimed at MERGE per
-- system CLAUDE.md §10.3 — the rebased branch takes the next free number just before
-- squash, and every reference is renumbered then. Do NOT prod-apply (each apply is
-- Mark-gated).
--
-- WHY THIS EXISTS. The access spine has the owner axis (app.user_id, 0153) and the
-- data_class axis (app.groups → class grant, 0175). The remaining axis is the COMPANY /
-- role axis: a row gated to a set of app-role slugs is visible only when the caller's
-- roles (app.groups) intersect that set. Finance row → finance + admin; a technician
-- (support) cannot read it.
--
-- THE SHAPE — whole-table role gate, NOT a per-row required_role column (ADR-0105 §3a,
-- already merged). The issue body floated a per-row `required_role` column; the MERGED
-- ADR-0105 slice-3 design overrides that: per ADR-0100 (broad employee read is the v1
-- posture) the company axis is deliberately NARROW — a whole-table gate keyed on the
-- intersection of app.groups with an allowed-role set, applied only to genuinely
-- sensitive comp/finance-shaped surfaces. A per-row required_role / account-visibility
-- model is explicitly the v2 concept ADR-0100 deferred. So this slice ships:
--   1. app_role_in_scope(text[]) — the shared company-axis predicate (the twin of
--      app_data_class_allowed, 0175), so the whole-table gate is one re-usable rule.
--   2. The FIRST company policy on a NEW, greenfield table (company_scoped_record) whose
--      reads route 100% through withIdentity from creation — the slice-2 / data_class
--      precedent (enable a new axis on a greenfield table, NEVER retrofit a live read
--      path; retrofitting onto pay_rate et al. would break ADR-0100 broad reads and is
--      gated on a real driver per ADR-0105 §3a). No existing read path gains a policy here.
--
-- POSTURE — ADDITIVE + FAIL-CLOSED, ZERO behavior change on apply: the only table that
-- gains a policy is brand-new and empty; no live read is touched. Fail-closed: an
-- unset/empty app.groups → no role in scope → FALSE → no rows (never an error), exactly
-- like the owner and data_class axes.
--
-- Archetype H (governance/control). App-native; NOT silver, NOT pipeline-merged → no OKF
-- concept file (the 0153/0175 greenfield-control precedent; semantic-layer-not-affected).
-- Frontend-owned schema (ADR-0042). No PII, no secrets (role slugs are non-sensitive).
-- Additive, idempotent, transactional. DORMANT — NOT prod-applied until the
-- orchestrator/Mark runs it. After apply, verify with the company-axis matrix in
-- docs/testing/rls-access-spine.md.

BEGIN;

-- ── 1. app_role_in_scope(text[]): the shared company/role-axis predicate ──────────────
-- TRUE when the caller's roles (app.groups) intersect the row's/table's allowed-role set.
-- STABLE + SECURITY DEFINER mirrors app_data_class_allowed (0175) so a whole-table gate is
-- one re-usable rule rather than an inline `&&` duplicated per policy. Fail-closed: an
-- unset/empty app.groups → '{}' → no intersection → FALSE (no rows), never an error.
CREATE OR REPLACE FUNCTION app_role_in_scope(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(current_setting('app.groups', true), '{}')::text[] && allowed_roles;
$$;
COMMENT ON FUNCTION app_role_in_scope(text[]) IS
  'Company/role-axis predicate (#979, ADR-0105 §3a): TRUE when the caller''s roles '
  '(app.groups) intersect allowed_roles. The whole-table role gate''s one re-usable rule; '
  'twin of app_data_class_allowed (0175). Fail-closed (unset app.groups → FALSE).';

-- ── 2. First company-axis table — company_scoped_record (greenfield) ──────────────────
-- A NEW, self-contained table that proves the company/role axis end-to-end with ZERO risk
-- to any live read path (the slice-2 / data_class greenfield precedent, ADR-0105 §3a). It
-- models the comp/finance-shaped sensitive surface the company axis is for: a row carries
-- a label only; the GATE is whole-table (finance + admin), not per-row, per ADR-0105 §3a.
CREATE TABLE IF NOT EXISTS company_scoped_record (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE company_scoped_record IS
  'Company-tier role-gated record (#979, ADR-0105 §3a). Whole-table company axis: visible '
  'only to finance + admin via RLS on app.groups (app_role_in_scope). Greenfield proof of '
  'the company/role axis — all reads route through withIdentity. Reference/control (H); no '
  'PII, no secrets.';

CREATE INDEX IF NOT EXISTS company_scoped_record_created_idx
  ON company_scoped_record (created_at);

DROP TRIGGER IF EXISTS trg_company_scoped_record_updated ON company_scoped_record;
CREATE TRIGGER trg_company_scoped_record_updated BEFORE UPDATE ON company_scoped_record
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. The company/role policy — whole-table gate to finance + admin ──────────────────
-- USING + WITH CHECK both keyed on app_role_in_scope(ARRAY['finance','admin']): a caller
-- whose app.groups includes finance or admin sees + may write rows; support / sales /
-- project_manager / hr / security do not. Re-runnable: DROP then CREATE (CREATE POLICY has
-- no IF NOT EXISTS). The allowed-role set lives in the policy (whole-table gate, ADR-0105
-- §3a) — a per-row required_role column is the deferred v2 concept, deliberately not here.
ALTER TABLE company_scoped_record ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_scoped_record_role ON company_scoped_record;
CREATE POLICY company_scoped_record_role ON company_scoped_record
  USING (app_role_in_scope(ARRAY['finance','admin']))
  WITH CHECK (app_role_in_scope(ARRAY['finance','admin']));

-- ── 4. Grants (defensive; roles may be absent in some envs) ───────────────────────────
-- Web reads/writes the gated record through withIdentity; backend reads when an agent
-- grounds against it. EXECUTE on the predicate to both app roles (it runs inside their
-- policy evaluation; SECURITY DEFINER means it reads as the owner, but EXECUTE is still
-- required to invoke it).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON company_scoped_record TO "mgid-imperioncrm-web-prd";
    GRANT EXECUTE ON FUNCTION app_role_in_scope(text[]) TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON company_scoped_record TO "mgid-imperioncrmbackendfunction";
    GRANT EXECUTE ON FUNCTION app_role_in_scope(text[]) TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
