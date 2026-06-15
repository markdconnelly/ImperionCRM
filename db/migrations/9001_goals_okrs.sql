-- 9001 goals / OKRs above projects (ADR-0069 D3, issue #348)
-- PLACEHOLDER NUMBER — the orchestrator renumbers this to the next free slot at
-- merge (concurrency contract §10.3; prod is at 0101). Do NOT treat 9001 as final.
--
-- A goal/OKR is a measurable objective that sits ABOVE projects (ADR-0069 D3): it
-- has an owner, a period, and a numeric target/current. Contributing work is linked
-- through `goal_link` (a goal can link many projects/tasks; a project/task can feed
-- many goals), each link carrying a `weight` for the weighted rollup. Progress is
-- EITHER manual (the `current` figure the owner sets) OR rolled up from linked
-- projects' completion — the read layer derives the rollup; nothing is stored
-- denormalized here. Acceptance (#348): a goal shows rolled-up progress from its
-- linked projects.
--
-- These are PM APPLICATION tables (objectives + their links), NOT ingested silver
-- entities with a source-of-record contract — so the OKF semantic-layer gate does
-- not apply (no concept file for `goal`/`goal_link`), exactly like `task`/`project`.
--
-- Grants: app-owned tables — the web MI keeps its read/write path (0045/0050/0058
-- defensive grant). No other identity gets access in this slice.
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT
-- prod-applied until Mark runs it. No secrets, no client PII here.

BEGIN;

-- ── goal: a measurable objective above projects (ADR-0069 D3) ────────────────
CREATE TABLE IF NOT EXISTS goal (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  -- owner drives RBAC/accountability; mirrors the project owner convention.
  owner_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  -- a free-text period label (e.g. 'Q3 2026', 'FY26 H2') — the cadence is the
  -- owner's, not a fixed enum (mirrors the configurable-estimate-unit stance).
  period        text,
  -- numeric key-result bounds. `current` is the MANUAL progress figure; when a
  -- goal has linked projects the read layer prefers the ROLLED-UP value (#348).
  target        numeric NOT NULL DEFAULT 100,
  current       numeric NOT NULL DEFAULT 0,
  -- 'manual' = trust the stored `current`; 'rollup' = derive from linked projects.
  progress_mode text NOT NULL DEFAULT 'rollup'
                CHECK (progress_mode IN ('manual', 'rollup')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE goal IS
  'A measurable objective / OKR above projects (ADR-0069 D3, #348). Progress is manual (`current`) or rolled up from linked projects'' completion via `goal_link` (derived in the read layer, never stored).';
COMMENT ON COLUMN goal.progress_mode IS
  'manual = use the stored `current`; rollup = derive % from linked projects'' milestone completion (ADR-0069 D3).';

DROP TRIGGER IF EXISTS trg_goal_updated ON goal;
CREATE TRIGGER trg_goal_updated BEFORE UPDATE ON goal
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── goal_link: contributing work attached to a goal (ADR-0069 D3) ────────────
-- A polymorphic link (parent_type/parent_id, the opportunity_id-style convention)
-- so a goal can roll up projects today and tasks/other work later without a new
-- table. `weight` proportions a link's contribution to the weighted rollup.
CREATE TABLE IF NOT EXISTS goal_link (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     uuid NOT NULL REFERENCES goal(id) ON DELETE CASCADE,
  parent_type text NOT NULL CHECK (parent_type IN ('project', 'task')),
  parent_id   uuid NOT NULL,           -- not FK-typed (polymorphic); app resolves it
  weight      numeric NOT NULL DEFAULT 1 CHECK (weight > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- one link per (goal, work object) — re-linking is idempotent.
  UNIQUE (goal_id, parent_type, parent_id)
);
COMMENT ON TABLE goal_link IS
  'Work that contributes to a goal (ADR-0069 D3, #348). Polymorphic (parent_type/parent_id) so a goal rolls up projects now and tasks later; `weight` proportions each link in the weighted rollup. CASCADE on goal delete.';

CREATE INDEX IF NOT EXISTS idx_goal_link_goal ON goal_link (goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_link_parent ON goal_link (parent_type, parent_id);

-- ── Least-privilege grants (0045/0050/0058 defensive pattern) ────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON goal       TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON goal_link  TO "mgid-imperioncrm-web-prd";
  END IF;
END $$;

COMMIT;
