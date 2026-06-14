-- 0088: Expense config + comp layer — qbo_expense_account, expense_category,
-- expense_policy, mileage_rate (+ employee_profile MileIQ mapping).
-- (ADR-0083, issue #483.) First of the three expense schema migrations
-- (0088 config/comp → 0089 capture/silver → 0090 autotask-write/recon).
--
-- ADR-0083 adds employee expense tracking & reimbursement, mirroring the
-- time-tracking shape (ADR-0082). This migration lays the configuration the rest
-- of the feature reads, plus the one comp figure expenses add — the mileage rate.
--
--   1. qbo_expense_account (bronze, per-source ADR-0039) — the QuickBooks chart of
--      accounts synced read-only. QuickBooks is the category system of record; the
--      app NEVER writes it. The bulk pull is the local pipeline's job (ADR-0042).
--   2. expense_category — the clean, website-facing category an admin MAPS onto a
--      QuickBooks account (hard link). Carries caps/threshold/billable-default/the
--      Autotask expenseCategory id + visibility. A category is inactive until it is
--      mapped (CHECK), so the seed rows below ship as until-mapped placeholders.
--      Mileage is a SYSTEM category (rate-driven, receipt-exempt) — mapping-exempt.
--   3. expense_policy — the configurable rule rows the policy/violation engine
--      evaluates per item pre-attest (a derived read model, surfaced as a
--      memory-jogger). hard = block attest, soft = nudge. Each rule links to the
--      canonical company expense policy authored in IT Glue (a business doc).
--   4. mileage_rate — the effective-dated, SYSTEM-wide reimbursement rate (per
--      mile). Lives in the payroll-gated comp store beside pay_rate (0085),
--      defaults to MileIQ's suggested rate, overridable on a system basis.
--
-- Also extends employee_profile (0085) with the MileIQ user-id mapping — the one
-- external mapping expenses add, joined by email like the Autotask/QuickBooks ones.
--
-- Security (ADR-0083 §Roles / §Security): the mileage rate is comp data — gated
-- exactly like pay_rate (0085): web (app-gated to finance/admin via
-- canApprovePayroll) + the backend reconciliation process read ONLY; NEVER on the
-- Entra-synced app_user row, NEVER visible to the pipelines, the employee, agents,
-- or any client surface. The pipelines get column-level SELECT on the new MileIQ
-- mapping column only (so the MileIQ pull / silver merge can join a drive → an
-- employee), never the rate. QuickBooks bronze is read-only sync (no app writes).
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042).
-- NOT prod-applied until Mark runs it (issue #494). No secrets.

BEGIN;

-- ── qbo_expense_account: QuickBooks chart-of-accounts bronze (read-only sync) ───
-- Per-source bronze (ADR-0039). The category system of record. Synced by the
-- local-pipeline QuickBooks bulk pull; the app never writes QuickBooks. The
-- QuickBooks account Id is the stable natural key expense_category links to.
CREATE TABLE IF NOT EXISTS qbo_expense_account (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qbo_account_id        text NOT NULL UNIQUE,          -- QuickBooks Account.Id (FK target)
  name                  text NOT NULL,
  fully_qualified_name  text,                          -- QBO's "Parent:Child" display path
  account_type          text,                          -- QBO AccountType (e.g. Expense)
  account_sub_type      text,
  active                boolean NOT NULL DEFAULT true,  -- QBO Active flag
  raw                   jsonb,                          -- original QBO payload (ADR-0039)
  synced_at             timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE qbo_expense_account IS
  'Bronze (ADR-0039): QuickBooks chart-of-accounts synced read-only — the Expense Category system of record (ADR-0083). Populated by the local-pipeline QuickBooks bulk pull; the app NEVER writes QuickBooks. Mapped to a clean expense_category by an admin.';

-- ── expense_category: clean website-facing category, hard-linked to QuickBooks ──
-- An admin maps a QuickBooks account → a clean display category with caps, a soft
-- threshold, a billable default, the Autotask expenseCategory id, and visibility.
-- A category is inactive until mapped (CHECK), EXCEPT the system Mileage category
-- (rate-driven, receipt-exempt). When a needed category is absent in QuickBooks the
-- app prompts; finance creates it in QuickBooks manually; the app re-syncs.
CREATE TABLE IF NOT EXISTS expense_category (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                           text NOT NULL UNIQUE,        -- stable code (e.g. 'meals')
  display_name                  text NOT NULL,
  -- Hard link to the QuickBooks account (the SoR). NULL = an until-mapped
  -- placeholder; a category may not go active unmapped (CHECK below), so the link
  -- is "hard" for every live category while still allowing seeded placeholders.
  qbo_account_id                text REFERENCES qbo_expense_account(qbo_account_id) ON DELETE RESTRICT,
  hard_cap                      numeric(12,2),               -- per-item cap; NULL = none (hard violation if exceeded)
  soft_threshold                numeric(12,2),               -- per-item nudge; NULL = none (soft violation if exceeded)
  billable_default              boolean NOT NULL DEFAULT false,
  autotask_expense_category_id  bigint,                      -- Autotask ExpenseItem.ExpenseCategory
  is_system                     boolean NOT NULL DEFAULT false,  -- true = Mileage (rate-driven, mapping-exempt)
  is_user_visible               boolean NOT NULL DEFAULT true,
  is_active                     boolean NOT NULL DEFAULT false,  -- inactive-until-mapped
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  mapped_by                     uuid REFERENCES app_user(id) ON DELETE SET NULL,  -- who mapped it (audit)
  -- A live category must be QuickBooks-mapped — the hard link. System categories
  -- (Mileage) are rate-driven and mapping-exempt.
  CONSTRAINT expense_category_active_requires_map CHECK (
    is_active = false OR is_system = true OR qbo_account_id IS NOT NULL
  )
);
COMMENT ON TABLE expense_category IS
  'Website-facing Expense Category (ADR-0083), hard-linked to a QuickBooks account (qbo_expense_account). Carries caps/soft-threshold/billable-default/Autotask category id/visibility. Inactive until an admin maps it (CHECK); Mileage is the rate-driven, receipt-exempt system category.';
COMMENT ON COLUMN expense_category.qbo_account_id IS
  'Hard FK to the QuickBooks account (the category SoR). NULL only for an until-mapped placeholder; a category cannot go active unmapped (CHECK), except the system Mileage category.';

CREATE INDEX IF NOT EXISTS idx_expense_category_active  ON expense_category (is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_expense_category_qbo     ON expense_category (qbo_account_id) WHERE qbo_account_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_expense_category_updated ON expense_category;
CREATE TRIGGER trg_expense_category_updated BEFORE UPDATE ON expense_category
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── expense_policy: the configurable per-item rule set (memory-jogger engine) ───
-- Evaluated per item, pre-attest. hard violations block attest; soft ones nudge.
-- params carries the rule's tunable knobs (e.g. a global soft threshold, a dedup
-- window); category-specific caps/thresholds live on expense_category. itglue_doc_ref
-- points at the canonical company policy authored in IT Glue (issue #493).
CREATE TABLE IF NOT EXISTS expense_policy (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key        text NOT NULL UNIQUE,
  severity        text NOT NULL CHECK (severity IN ('hard','soft')),
  description     text,
  params          jsonb NOT NULL DEFAULT '{}'::jsonb,
  itglue_doc_ref  text,                               -- link to the canonical IT Glue policy doc
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE expense_policy IS
  'Configurable Expense Policy rule rows (ADR-0083) the violation engine evaluates per item pre-attest. severity hard = block attest, soft = nudge (attest with a note). params holds tunable knobs; each rule links to the canonical company policy in IT Glue (#493).';

DROP TRIGGER IF EXISTS trg_expense_policy_updated ON expense_policy;
CREATE TRIGGER trg_expense_policy_updated BEFORE UPDATE ON expense_policy
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── mileage_rate: effective-dated, SYSTEM-wide reimbursement rate (comp store) ──
-- Unlike pay_rate (per-employee), the mileage rate is a single system basis
-- (ADR-0083: "overridable on a system basis"). A drive reconciles against the rate
-- in force on its date (greatest effective_from <= drive date). Defaults to MileIQ's
-- suggested rate; an admin can override on a system basis. Append-mostly (history
-- preserved for back-period reconciliation). Same comp gating as pay_rate (0085).
CREATE TABLE IF NOT EXISTS mileage_rate (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from date NOT NULL UNIQUE,                 -- inclusive; one system rate per date
  rate           numeric(8,4) NOT NULL,                -- USD per mile (e.g. 0.7000)
  source         text NOT NULL DEFAULT 'system_override'
                   CHECK (source IN ('mileiq_suggested','system_override')),
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES app_user(id) ON DELETE SET NULL  -- who set the rate (audit)
);
COMMENT ON TABLE mileage_rate IS
  'Effective-dated SYSTEM-wide mileage reimbursement rate (USD/mile, ADR-0083). A drive uses the rate in force on its date (greatest effective_from <= drive date). Defaults to MileIQ suggestion, overridable on a system basis. Comp data — gated exactly like pay_rate (0085): web (app finance/admin) + backend read only, never pipelines/app_user.';

CREATE INDEX IF NOT EXISTS idx_mileage_rate_effective ON mileage_rate (effective_from DESC);

-- ── employee_profile: add the MileIQ user-id mapping (extends 0085) ────────────
-- The one external mapping expenses add (ADR-0083). Resolved by email like the
-- Autotask Resource + QuickBooks vendor ids; lets the MileIQ pull / silver merge
-- join a drive → an employee. A MAPPING column (not comp) — same pipeline access.
ALTER TABLE employee_profile
  ADD COLUMN IF NOT EXISTS mileiq_user_id text;
COMMENT ON COLUMN employee_profile.mileiq_user_id IS
  'Mapping column (ADR-0083) — the MileIQ user id, resolved by email; the pipelines may read it to attribute a MileIQ drive to the employee. NOT comp data.';
CREATE INDEX IF NOT EXISTS idx_employee_profile_mileiq ON employee_profile (mileiq_user_id) WHERE mileiq_user_id IS NOT NULL;

-- ── Seed: default categories (until-mapped placeholders) + the v1 policy rules ──
-- Categories ship inactive (is_active=false) until an admin maps each to a
-- QuickBooks account (#489). Mileage is the active system category. Idempotent on
-- the stable key.
INSERT INTO expense_category (key, display_name, billable_default, is_system, is_active) VALUES
  ('meals',    'Meals',    false, false, false),
  ('travel',   'Travel',   false, false, false),
  ('lodging',  'Lodging',  false, false, false),
  ('supplies', 'Supplies', false, false, false),
  ('software', 'Software', false, false, false),
  ('other',    'Other',    false, false, false)
ON CONFLICT (key) DO NOTHING;
-- Mileage: the system category — rate-driven, receipt-exempt, active out of the box.
INSERT INTO expense_category (key, display_name, billable_default, is_system, is_active) VALUES
  ('mileage', 'Mileage', false, true, true)
ON CONFLICT (key) DO NOTHING;

-- v1 policy rule set (ADR-0083 §Policy engine). hard = block attest; soft = nudge.
-- itglue_doc_ref is NULL until the policy doc is authored (#493).
INSERT INTO expense_policy (rule_key, severity, description) VALUES
  ('missing_receipt',         'hard', 'An out-of-pocket item must have a receipt (mileage is receipt-exempt).'),
  ('over_category_cap',       'hard', 'Item amount exceeds the category hard cap.'),
  ('dated_outside_month',     'hard', 'Item dated outside the report month.'),
  ('future_dated',            'hard', 'Item dated in the future.'),
  ('suspected_duplicate',     'soft', 'Same merchant + amount + date as another item (possible duplicate).'),
  ('over_soft_threshold',     'soft', 'Item amount exceeds the category soft threshold.'),
  ('billable_missing_company','soft', 'A billable item is missing a client (companyID).'),
  ('uncategorized',           'soft', 'Item is uncategorized / "Other".')
ON CONFLICT (rule_key) DO NOTHING;

-- ── Grants (0085/0050 defensive pattern; roles may be absent in some envs) ──────
--   • qbo_expense_account (bronze): local-pipeline RW (the QuickBooks bulk pull);
--     web SELECT (the mapping console reads it); backend SELECT (category match).
--   • expense_category: web RW (admin maps/configures); backend SELECT (resolves
--     the Autotask category id + billable default when writing the ExpenseReport);
--     cloud pipeline SELECT (silver merge resolves an item's category).
--   • expense_policy: web RW (admin configures the rules); backend SELECT (defensive
--     — server-side evaluation if ever needed). No pipeline access.
--   • mileage_rate: COMP DATA — mirrors pay_rate (0085) EXACTLY: web RW (app-gated
--     finance/admin), backend SELECT (derives the mileage amount in reconciliation).
--     NEVER granted to either pipeline.
--   • employee_profile.mileiq_user_id: column-level SELECT to both pipelines (the
--     new mapping column only — they still get no classification, no comp).
DO $$
BEGIN
  -- web (GUI)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON qbo_expense_account TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE ON expense_category TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE ON expense_policy   TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE ON mileage_rate     TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  -- backend (reconciliation + Autotask write reads)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON qbo_expense_account TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON expense_category    TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON expense_policy       TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON mileage_rate        TO "mgid-imperioncrmbackendfunction";  -- the comp reader
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  -- cloud pipeline (silver merge): category read + the MileIQ mapping column only.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON expense_category TO "mgid-imperioncrmpipeline";
    GRANT SELECT (mileiq_user_id) ON employee_profile TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline grants.';
  END IF;

  -- local pipeline (QuickBooks bulk pull + MileIQ drive pull): writes the QBO
  -- bronze; reads the MileIQ mapping column to attribute drives.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON qbo_expense_account TO "imperion-localpipeline";
    GRANT SELECT (mileiq_user_id) ON employee_profile   TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
