-- 0135: `change_request` + `change_affected_ci` — the Change Enablement core (#656,
-- parent #373 [Change Enablement; problem management dropped per Mark 2026-06-15],
-- ADR-0079). Migration number 0135 claimed at MERGE per system CLAUDE.md §10.3 —
-- authored against this placeholder; if another migration merges during the CI window,
-- renumber this file (and fix every reference) just before squash.
--
-- WHY THIS EXISTS. ITIL 4 Change Enablement, app-native. Imperion CREATES the change
-- (typed standard | normal | emergency) with CMDB-derived risk, a lightweight approval,
-- and a schedule — an app-native WORKING OBJECT — then later GATED-WRITES it out to
-- Autotask change management (Autotask = the eventual change RECORD system of record,
-- keyed by `autotask_change_id`; that round-trip is the separate gated slice #661). This
-- migration is just the working object + its affected-CI link; the downstream slices
-- POPULATE the nullable columns seeded here, so they need NO migration of their own:
--   - #658  CMDB-derived risk + override        → risk_derived / risk_override
--   - #659  lightweight approval by change type  → approval_status / approved_by_user_id / approved_at
--   - #660  change calendar / scheduling         → schedule_start / schedule_end
--   - #661  route → Autotask (gated write, HITL) → autotask_change_id
--
-- ARCHETYPE: app-native working object (the website is the SoR for the working copy;
-- Autotask is the eventual record SoR via the gated route #661 — the twin posture of the
-- CMDB overlays #647/#648, which are app-native with a deferred IT Glue write-back). A
-- change_request is a REAL persisted row with a uuid PK (unlike a CI, which is a
-- projection) so the affected-CI link can FK to it.
--
-- AFFECTED CIs. `change_affected_ci` links a change to the Configuration Items it
-- touches. A CI is the read-only `cmdb_ci` UNION projection over silver
-- `account`/`contact`/`device` (#645) — there is NO `cmdb_ci` table and `ci_id` is unique
-- only WITHIN a `ci_type`, so the CI endpoint is a polymorphic `(ci_type, ci_id)` text
-- pair, NOT an FK (identical to `ci_relationship`.from/to, migration 0131, and
-- `cmdb_ci_overlay`, migration 0132). The app validates the CI exists in
-- `listConfigurationItems` before insert. The CHANGE endpoint IS an FK (change_request is
-- a real row) and cascades on delete.
--
-- WHAT THIS IS NOT:
--   * NOT an Autotask change mirror — this is the app-native working object; pushing it to
--     Autotask is the separate gated slice #661 (`autotask_change_id` is the join key).
--   * NOT a new CI store — CIs remain the read-only `cmdb_ci` union (#645). The link table
--     references CI business keys, it does not mint CIs.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until the orchestrator/Mark runs it (the app degrades to mock/[] until
-- then). No secrets; no row-level PII (a change is a title/description + status + CI
-- business keys; it mints no personal data of its own).

BEGIN;

-- ── change_type: the ITIL change classification ─────────────────────────────────────────
-- standard = pre-authorized low-risk · normal = assessed + approved · emergency = expedited.
-- An ENUM (not a CHECK) so the create form, the approval routing (#659), and any agent share
-- one vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'change_type') THEN
    CREATE TYPE change_type AS ENUM ('standard', 'normal', 'emergency');
  END IF;
END $$;

-- ── change_status: the change lifecycle ─────────────────────────────────────────────────
-- draft → pending_approval → approved | rejected → scheduled → completed (or cancelled at
-- any point). An ENUM so the board, the approval slice (#659), and the calendar slice (#660)
-- share one vocabulary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'change_status') THEN
    CREATE TYPE change_status AS ENUM (
      'draft', 'pending_approval', 'approved', 'rejected',
      'scheduled', 'completed', 'cancelled'
    );
  END IF;
END $$;

-- ── change_approval_status: the lightweight approval outcome (#659) ─────────────────────
-- Distinct from `change_status` (the overall lifecycle): a change can be `pending_approval`
-- in the lifecycle while its approval is `pending`. Nullable on change_request — NULL = no
-- approval has been requested yet (a draft / standard change).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'change_approval_status') THEN
    CREATE TYPE change_approval_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- ── change_request: the app-native change working object ────────────────────────────────
-- A REAL persisted row (uuid PK) so the affected-CI link FKs to it. The risk / approval /
-- schedule / autotask columns are nullable and seeded empty here — the downstream slices
-- (#658/#659/#660/#661) POPULATE them, none ADD them.
CREATE TABLE IF NOT EXISTS change_request (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type          change_type   NOT NULL DEFAULT 'normal',
  status               change_status NOT NULL DEFAULT 'draft',
  title                text          NOT NULL,
  description          text,
  -- Who raised the change (mirrors the segment.owner_user_id pattern). FK to the identity
  -- mirror; nullable so a system/agent-raised change is allowed.
  requester_user_id    uuid REFERENCES app_user(id) ON DELETE SET NULL,
  -- Optional owning client account (a change may be account-scoped or estate-wide).
  account_id           uuid REFERENCES account(id) ON DELETE SET NULL,

  -- ── Risk (#658) — CMDB-derived risk + admin override. Effective risk = override ?? derived
  --    (computed in the app layer, NOT a generated column — the same override-wins pattern as
  --    cmdb_ci_overlay). Stored as a small int score (0–100) so #658 can rank/threshold; the
  --    in-code rule maps the score to a band. NULL = not yet assessed.
  risk_derived         integer CHECK (risk_derived  IS NULL OR (risk_derived  BETWEEN 0 AND 100)),
  risk_override        integer CHECK (risk_override IS NULL OR (risk_override BETWEEN 0 AND 100)),

  -- ── Approval (#659) — lightweight approval by change type. NULL approval_status = no
  --    approval requested yet.
  approval_status      change_approval_status,
  approved_by_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
  approved_at          timestamptz,

  -- ── Schedule (#660) — the planned change window. Both NULL until scheduled; end ≥ start.
  schedule_start       timestamptz,
  schedule_end         timestamptz,

  -- ── Routing (#661) — the Autotask change id once the change is gated-written out. NULL
  --    until routed; Autotask is the eventual record SoR keyed by this.
  autotask_change_id   text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT change_request_schedule_window CHECK (
    schedule_start IS NULL OR schedule_end IS NULL OR schedule_end >= schedule_start
  )
);
COMMENT ON TABLE change_request IS
  'ITIL 4 Change Enablement core (#656, parent #373, ADR-0079): the app-native change WORKING object — typed standard|normal|emergency, with status, requester, optional account, and nullable risk/approval/schedule/autotask_change_id columns the downstream slices (#658/#659/#660/#661) POPULATE. The website is the SoR for the working copy; Autotask is the eventual change RECORD SoR via the gated route #661 (autotask_change_id is the join key). App-native — nothing here writes Autotask until that gated slice. No PII, no secrets. Migration 0135.';
COMMENT ON COLUMN change_request.risk_derived IS
  'CMDB-derived risk score 0–100 (#658), computed from affected-CI criticality/blast-radius. NULL = not yet assessed. Effective risk = risk_override ?? risk_derived (resolved in the app layer, not a generated column).';
COMMENT ON COLUMN change_request.risk_override IS
  'Admin risk-score override 0–100 (#658). NULL = no override → effective = risk_derived. Override-wins, mirroring cmdb_ci_overlay.';
COMMENT ON COLUMN change_request.approval_status IS
  'Lightweight approval outcome (#659): pending|approved|rejected. NULL = no approval requested yet (draft / pre-authorized standard change). Distinct from status (the overall lifecycle).';
COMMENT ON COLUMN change_request.autotask_change_id IS
  'Autotask change id once the change is gated-written out (#661). NULL until routed. Autotask is the eventual change record SoR keyed by this — the app never writes Autotask before that gated slice.';

-- Board/list reads filter by status + type and sort newest-first; index the hot paths.
CREATE INDEX IF NOT EXISTS idx_change_request_status      ON change_request (status);
CREATE INDEX IF NOT EXISTS idx_change_request_type        ON change_request (change_type);
CREATE INDEX IF NOT EXISTS idx_change_request_account     ON change_request (account_id);
CREATE INDEX IF NOT EXISTS idx_change_request_created     ON change_request (created_at DESC);
-- The calendar slice (#660) windows by schedule_start; partial index (scheduled rows only).
CREATE INDEX IF NOT EXISTS idx_change_request_schedule
  ON change_request (schedule_start)
  WHERE schedule_start IS NOT NULL;

-- ── change_affected_ci: the change → Configuration Item link ────────────────────────────
-- The CHANGE endpoint is an FK (change_request is a real row) and cascades. The CI endpoint
-- is the polymorphic `(ci_type, ci_id)` business key over the read-only cmdb_ci union (#645)
-- — NOT an FK (a CI is a projection, ci_id unique only within a ci_type). The app validates
-- the CI exists in listConfigurationItems before insert (same contract as ci_relationship).
CREATE TABLE IF NOT EXISTS change_affected_ci (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id       uuid NOT NULL REFERENCES change_request(id) ON DELETE CASCADE,
  ci_type         text NOT NULL CHECK (ci_type IN ('account', 'user', 'device')),
  ci_id           text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- One link per (change, CI) — re-adding the same affected CI is a no-op (idempotent picker).
  CONSTRAINT change_affected_ci_uq UNIQUE (change_id, ci_type, ci_id)
);
COMMENT ON TABLE change_affected_ci IS
  'Change → Configuration Item link (#656, parent #373, ADR-0079): the CIs a change_request touches. change_id is an FK (cascades); the CI endpoint is the polymorphic (ci_type, ci_id) business key over the read-only cmdb_ci union (#645) — NOT an FK (a CI is a projection; ci_id unique only within a ci_type), identical to ci_relationship endpoints (migration 0131). The affected-CI set feeds CMDB-derived risk (#658). No PII, no secrets. Migration 0135.';

CREATE INDEX IF NOT EXISTS idx_change_affected_ci_change ON change_affected_ci (change_id);
CREATE INDEX IF NOT EXISTS idx_change_affected_ci_ci     ON change_affected_ci (ci_type, ci_id);

-- ── Grants: the app reads + writes (the /changes CRUD + affected-CI picker, change:write,
--    ADR-0045); the backend reads + writes (the future Change Enablement / Autotask-route
--    agent #661); the pipeline reads (observability of the app-native working object).
--    Defensive (roles may be absent), mirroring 0131/0132's grant block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON change_request    TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON change_affected_ci TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON change_request    TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE, DELETE ON change_affected_ci TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON change_request    TO "mgid-imperioncrmpipeline";
    GRANT SELECT ON change_affected_ci TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grant.';
  END IF;
END $$;

COMMIT;
