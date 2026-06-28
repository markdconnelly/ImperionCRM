-- 0222: dispatch technician + skill model (epic #1039, child #1071). Foundation for
-- skill + load routing (#1073 auto-assign · #1074 utilization); capacity is #1072.
-- Migration number 0222 is a PLACEHOLDER claimed at MERGE per system CLAUDE.md §10.3 —
-- the rebased branch takes the next free number and renames the file.
--
-- WHY. The service-delivery dispatch substrate (#1039, Jocko) needs a routable-resource
-- registry and a skill taxonomy before any skill-aware auto-assignment (#1073) can exist.
-- Today the people model is HUMAN-only and keyed on app_user: `user_capacity` (0105, weekly
-- hours per employee) and `work_assignment` (0099, who is attached to a task/project). The
-- dispatch epic explicitly routes to technicians that are **human AND agent** ("let the AI
-- Technician self-assign within limits"), and neither existing table carries an agent
-- dimension or a skill model. This migration adds them:
--   • `skill`            — the skill taxonomy (app-authored).
--   • `technician`       — the unified routable resource: a human (→ app_user) OR an agent
--                          (→ agent registry, 0056). Harmonises with the human-keyed model —
--                          a human technician's capacity stays `user_capacity` (app_user);
--                          agent capacity/calendar is future #1072 work.
--   • `technician_skill` — which skills a technician has, with a 1..5 proficiency.
--
-- These are **app-native operational config tables, not silver tier** (like `user_capacity` /
-- `work_assignment` / `task_recurrence`) — no medallion source, no semantic-layer concept file
-- applies (ADR-0086; `semantic-layer-not-affected`). No client PII (employees + agents only).
--
-- Schema-foundation only: no GUI/data-layer in this PR (the user_capacity/#346 precedent — land
-- the schema so the routing/admin lanes can consume it). Additive, idempotent, transactional.
-- Frontend-owned schema (ADR-0042 §1). No secrets.

BEGIN;

-- ── skill taxonomy ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,        -- stable slug, e.g. 'm365-admin' / 'network-firewall'
  name         text NOT NULL,               -- display label
  category     text,                        -- grouping, e.g. 'cloud' | 'network' | 'security'
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE skill IS
  'Dispatch skill taxonomy (#1071, epic #1039). App-authored (admin GUI), not silver. The vocabulary skill+load routing (#1073) matches a ticket''s required skills against technician proficiency.';

-- ── technician: the unified routable resource (human OR agent) ───────────────────────────────
CREATE TABLE IF NOT EXISTS technician (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind             text NOT NULL CHECK (kind IN ('human', 'agent')),
  app_user_id      uuid REFERENCES app_user(id) ON DELETE CASCADE,  -- set iff kind='human'
  agent_id         uuid REFERENCES agent(id)    ON DELETE CASCADE,  -- set iff kind='agent' (registry 0056)
  display_name     text NOT NULL,            -- denormalised label (agents have no app_user row)
  is_dispatchable  boolean NOT NULL DEFAULT true,  -- eligible for auto-assignment (#1073)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- Exactly one identity, matching `kind`.
  CONSTRAINT technician_identity_ck CHECK (
    (kind = 'human' AND app_user_id IS NOT NULL AND agent_id IS NULL) OR
    (kind = 'agent' AND agent_id    IS NOT NULL AND app_user_id IS NULL)
  )
);
COMMENT ON TABLE technician IS
  'Dispatch routable-resource registry (#1071, epic #1039): a human (→ app_user) or an agent (→ agent registry, 0056) the service-delivery router can assign work to. Human capacity stays in user_capacity (0105, keyed on app_user); this adds the agent dimension + dispatchability + a skill model. App-native, not silver. No client PII.';
COMMENT ON COLUMN technician.is_dispatchable IS
  'Whether skill+load auto-assignment (#1073) may route to this technician. A human on leave / a paused agent is set false to remove them from the pool without losing their skills/history.';

-- One technician row per identity.
CREATE UNIQUE INDEX IF NOT EXISTS uq_technician_app_user
  ON technician (app_user_id) WHERE app_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_technician_agent
  ON technician (agent_id) WHERE agent_id IS NOT NULL;
-- Routing reads the dispatchable pool.
CREATE INDEX IF NOT EXISTS idx_technician_dispatchable
  ON technician (is_dispatchable) WHERE is_dispatchable;

-- ── technician_skill: skills a technician holds, with proficiency ────────────────────────────
CREATE TABLE IF NOT EXISTS technician_skill (
  technician_id  uuid NOT NULL REFERENCES technician(id) ON DELETE CASCADE,
  skill_id       uuid NOT NULL REFERENCES skill(id)      ON DELETE CASCADE,
  proficiency    smallint NOT NULL DEFAULT 3 CHECK (proficiency BETWEEN 1 AND 5),  -- 1 novice .. 5 expert
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (technician_id, skill_id)
);
COMMENT ON TABLE technician_skill IS
  'Which skills a technician has and how strong (proficiency 1..5), #1071. The match surface for skill+load routing (#1073). PK (technician_id, skill_id) makes assigning a skill idempotent.';
-- Reverse lookup: "who has skill X?" for the router.
CREATE INDEX IF NOT EXISTS idx_technician_skill_skill ON technician_skill (skill_id);

-- ── Grants ───────────────────────────────────────────────────────────────────────────────────
-- These are admin-authored config the GUI writes directly (define skills, register technicians,
-- assign skills) → explicit web write grant (post-0216 least-privilege baseline: future tables
-- are web-SELECT-only by default, so writes must be granted per-table; the allowlist doc
-- docs/security/web-role-write-allowlist.md is updated in lockstep). Backend reads for routing.
-- Defensive (roles may be absent in some envs), mirroring 0213/0090.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON skill, technician, technician_skill
      TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON skill, technician, technician_skill
      TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
