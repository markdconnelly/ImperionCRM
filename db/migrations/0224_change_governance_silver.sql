-- 0224: `change_freeze` + `rollback_plan` + `standard_change_catalog` silver — the three
-- change-governance additions Marshall (Stream 06, Change→Release, #1553) needs on top of the
-- existing `change_request` substrate (0135, dormant; src/lib/change.ts; /changes surfaces).
-- (#1579, parent #373, ADR-0079 [Change Enablement]).
--
-- Migration number 0224 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against a placeholder; the rebased branch takes the next free number just before squash. If
-- another migration merges during the CI window, renumber this file + every reference.
--
-- WHY THIS EXISTS. 0135 shipped the app-native ITIL change WORKING object (typed
-- standard|normal|emergency, status, risk, lightweight approval, schedule, affected-CI link).
-- Three governance gates were left to a follow-up — this slice. They turn schedule-conflict
-- detection from informational into a hard block, make a rollback plan a precondition of
-- approval, and let pre-authorized standard changes auto-approve while normal/emergency park:
--
--   1. change_freeze (OP-09) — a freeze-calendar window. A change whose schedule overlaps an
--      ACTIVE freeze window is a hard `always_gate` block (today the schedule-conflict check in
--      change.ts is informational-only). Global (account_id NULL) or per-account.
--   2. rollback_plan (OP-05) — a structured rollback plan attached to a change_request, with its
--      own approval lifecycle (draft→approved|rejected). REQUIRED before a normal/emergency
--      change is approved (the gate is enforced in the change-intake workflow, not the DB).
--   3. standard_change_catalog (OP-10) — pre-authorized standard-change templates that AUTO-
--      APPROVE (auto_approve = true). A catalogued standard change skips the approval park;
--      normal/emergency always park.
--
-- ARCHETYPE: app-native single-source-of-record silver (archetype B), the `change_request`
-- (0135) neighbour. Each is a REAL persisted row with a uuid PK. rollback_plan FKs to the real
-- change_request row (0135); change_freeze and standard_change_catalog optionally scope to
-- account.
--
-- WHO WRITES IT. App-native: the /changes surfaces + Marshall's change-intake procedure write it
-- (change:write, ADR-0045), backend-executed. NOT a bronze→silver merge (no external SoR for
-- the company's own freeze calendar / rollback plans / standard-change library). Read-only to
-- web for render.
--
-- New silver entities → each gets a NEW OKF concept file (docs/database/semantic-layer/tables/
-- change_freeze.md, rollback_plan.md, standard_change_catalog.md) + a coverage-matrix row in
-- THIS PR (system CLAUDE.md §11; the semantic-layer gate requires the concept file for a CREATE
-- of a concept-bearing silver table). Frontend-owned schema (ADR-0042). Additive + idempotent +
-- transactional. No row-level PII (governance metadata — windows, plan steps, change templates;
-- mints no personal data — operational data_class). No secrets. DORMANT — NOT prod-applied until
-- the orchestrator/Mark runs it (each prod apply is Mark-gated, §10.3).

BEGIN;

-- ── rollback_approval_status: the rollback-plan approval lifecycle ─────────────────────────
-- draft → approved | rejected. Distinct from change_request.approval_status (the CHANGE's
-- approval): the rollback plan has its own sign-off, and an approved plan is the precondition
-- the change-intake workflow checks before approving a normal/emergency change.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rollback_approval_status') THEN
    CREATE TYPE rollback_approval_status AS ENUM ('draft', 'approved', 'rejected');
  END IF;
END $$;

-- ── change_freeze: the freeze-calendar window (OP-09) ─────────────────────────────────────
-- A change scheduled into an ACTIVE window (now between start_at/end_at, or its schedule_start
-- overlaps the window) is a hard always_gate block — enforced in the change-intake workflow.
CREATE TABLE IF NOT EXISTS change_freeze (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = a GLOBAL freeze (every account); set = an account-scoped freeze.
  account_id    uuid REFERENCES account(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  reason        text,
  start_at      timestamptz NOT NULL,
  end_at        timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT change_freeze_window CHECK (end_at >= start_at)
);
COMMENT ON TABLE change_freeze IS
  'Change freeze-calendar window (#1579, OP-09, parent #373, ADR-0079): a change whose schedule overlaps an ACTIVE window is a hard always_gate block (the change-intake workflow enforces it; 0135''s change.ts conflict check was informational-only). Global (account_id NULL) or per-account. App-native (archetype B), operational data_class. No PII, no secrets. Migration 0224 (PLACEHOLDER — real number at merge).';

-- Active-window lookup at intake time: window bounds + account scope.
CREATE INDEX IF NOT EXISTS idx_change_freeze_window  ON change_freeze (start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_change_freeze_account ON change_freeze (account_id);

-- ── rollback_plan: the change rollback artifact (OP-05) ───────────────────────────────────
-- A structured rollback plan attached to a change_request (0135). REQUIRED (approval_status =
-- approved) before a normal/emergency change is approved — the precondition is enforced in the
-- change-intake workflow, not the DB.
CREATE TABLE IF NOT EXISTS rollback_plan (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id  uuid NOT NULL REFERENCES change_request(id) ON DELETE CASCADE,
  steps              text NOT NULL,                              -- the ordered rollback procedure
  approval_status    rollback_approval_status NOT NULL DEFAULT 'draft',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  -- One plan per change (re-authoring updates it). The change-intake gate reads this row.
  CONSTRAINT rollback_plan_change_uq UNIQUE (change_request_id)
);
COMMENT ON TABLE rollback_plan IS
  'Change rollback artifact (#1579, OP-05, parent #373, ADR-0079): a structured rollback plan attached to a change_request (FK, ON DELETE CASCADE) with its own draft→approved|rejected lifecycle. An approved plan is the precondition the change-intake workflow checks before approving a normal/emergency change. One plan per change (UNIQUE change_request_id). App-native (archetype B), operational data_class. No PII, no secrets. Migration 0224 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_rollback_plan_change   ON rollback_plan (change_request_id);
CREATE INDEX IF NOT EXISTS idx_rollback_plan_approval ON rollback_plan (approval_status);

-- ── standard_change_catalog: pre-authorized standard-change templates (OP-10) ─────────────
-- A catalogued standard change can AUTO-APPROVE (auto_approve = true), skipping the approval
-- park; normal/emergency always park. Global (account_id NULL) or per-account.
CREATE TABLE IF NOT EXISTS standard_change_catalog (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = a GLOBAL template (every account); set = an account-scoped template.
  account_id    uuid REFERENCES account(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  definition    text,                                       -- the template body (scope, steps, validation)
  risk_level    text,                                       -- low|medium|high band (text — band evolves without a migration)
  auto_approve  boolean     NOT NULL DEFAULT false,         -- true = a matching standard change skips the approval park
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE standard_change_catalog IS
  'Pre-authorized standard-change template (#1579, OP-10, parent #373, ADR-0079): a catalogued standard change whose auto_approve=true lets the change-intake workflow auto-approve a matching standard change (normal/emergency always park). Global (account_id NULL) or per-account. App-native (archetype B), operational data_class. No PII, no secrets. Migration 0224 (PLACEHOLDER — real number at merge).';

CREATE INDEX IF NOT EXISTS idx_standard_change_catalog_account ON standard_change_catalog (account_id);

-- ── updated_at triggers (the 0210/0211 convention) ────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_change_freeze_updated ON change_freeze;
CREATE TRIGGER trg_change_freeze_updated BEFORE UPDATE ON change_freeze
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rollback_plan_updated ON rollback_plan;
CREATE TRIGGER trg_rollback_plan_updated BEFORE UPDATE ON rollback_plan
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_standard_change_catalog_updated ON standard_change_catalog;
CREATE TRIGGER trg_standard_change_catalog_updated BEFORE UPDATE ON standard_change_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Grants: the app reads + writes (the /changes governance surfaces + Marshall's change-intake,
--    change:write, ADR-0045); the backend reads + writes (Marshall executes server-side); the
--    pipeline reads (observability); local-pipeline reads. Defensive (roles may be absent),
--    mirroring 0135/0211's grant block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON change_freeze           TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON rollback_plan           TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON standard_change_catalog TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON change_freeze           TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE, DELETE ON rollback_plan           TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE, DELETE ON standard_change_catalog TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON change_freeze           TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON rollback_plan           TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON standard_change_catalog TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON change_freeze           TO "imperion-localpipeline";
    GRANT SELECT ON rollback_plan           TO "imperion-localpipeline";
    GRANT SELECT ON standard_change_catalog TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;
END $$;

COMMIT;
