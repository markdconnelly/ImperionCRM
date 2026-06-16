-- 9001 (PLACEHOLDER — claim the real number at merge per system CLAUDE.md §10.3; 0122 was the
--  latest applied/repo migration, so 0123 is the next free slot once rebased on main):
-- `agent_autopilot_policy` — the data-driven autonomy dial for orchestration agents
-- (#721, ADR-0087 orchestration & observability matrix).
--
-- WHY THIS EXISTS: ADR-0087 makes "autonomy is one dial, stored as data" load-bearing —
-- gating an agent's action, or ramping it after testing, is meant to be a DATA change, not
-- a code change. The matrix and the ADR both reference an `autopilot_policies` table as the
-- store. But the only `autopilot_policies` table in the schema is FE migration 0038
-- (unrelated **Intune Autopilot device-posture bronze**) — a name collision. So no agent can
-- read its rung from data: BE #156 (the Collections AR-dunning agent) had to HARDCODE
-- `MAX_AUTONOMY_RUNG='L1'`. This migration creates the real, non-colliding dial table so the
-- backend can later read the rung from data (a separate BE follow-up).
--
-- NAME: `agent_autopilot_policy` (singular, distinct from the taken `autopilot_policies`/0038).
--
-- ARCHETYPE: H (reference / config / governance) per the data-and-automation-doctrine — an
-- app-native control table, NOT silver data and NOT pipeline-merged. It sits in the
-- Audit/governance domain (horizontal), the twin of `agent_settings` / `agent_tool_grant`.
--
-- KEYING: one rung per (agent · workflow · plane), exactly the matrix's keying. `agent_key` is
-- the stable roster key (e.g. 'collections', 'lead-response'); `workflow_key` scopes the rung
-- to one work-unit, or '*' = the agent's default for every workflow; `plane` is which plane
-- the agent runs on (ICM product runtime / coding meta-layer / infra). A read resolves the
-- most-specific matching row (exact workflow_key beats '*'). The Mark-gate is an orthogonal
-- boolean flag, not a rung — an L3 agent with `mark_gated` still funnels customer-facing /
-- money / prod-migration / deploy legs to the single human queue (ADR-0087 security impact).
--
-- WHAT THIS IS NOT:
--   * NOT `autopilot_policies` (0038) — that is Intune device-posture bronze; unrelated.
--   * NOT a run ledger — runs/telemetry stay in `agent_run`/`agent_message` (ADR-0087).
--   * NOT agent identity/config — that is `agent`/`agent_settings`/`agent_tool_grant`. This is
--     ONLY the autonomy rung + Mark-gate flag for an (agent, workflow, plane).
--   * NOT a code-knowledge or PII store — config keys only; no secrets, no client data.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT prod-applied
-- until the orchestrator runs it. No secrets, no PII.

BEGIN;

-- ── autonomy_rung: the one dial's rungs (ADR-0087), lowest authority first ─────────────────
-- L0 = observe (read-only) · L1 = draft (propose, hold for human) · L2 = act-gated (idempotent
-- write) · L3 = auto (autonomous). An ENUM (not a CHECK) so the backend dial-reader, agents,
-- and any future management UI share one typed vocabulary. (The 🔒 Mark-gate is NOT a rung —
-- it is the orthogonal `mark_gated` flag below.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autonomy_rung') THEN
    CREATE TYPE autonomy_rung AS ENUM ('L0', 'L1', 'L2', 'L3');
  END IF;
END $$;

-- ── agent_plane: which plane an agent runs on (ADR-0087's two-planes-one-methodology) ──────
-- icm = the ICM product runtime (trigger → workflow run) · coding = the agentic-coding
-- meta-layer (GitHub issue → worktree) · infra = the platform/SRE plane (metric/alert).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_plane') THEN
    CREATE TYPE agent_plane AS ENUM ('icm', 'coding', 'infra');
  END IF;
END $$;

-- ── agent_autopilot_policy: the dial — one current rung per (agent · workflow · plane) ─────
CREATE TABLE IF NOT EXISTS agent_autopilot_policy (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable agent roster key (matches docs/agents/orchestration-matrix.md), e.g.
  -- 'collections', 'lead-response', 'time-payroll'. Config key, not a person — no PII.
  agent_key     text NOT NULL,
  -- Workflow / work-unit the rung scopes to, or '*' = the agent's default for every workflow.
  -- '*' is a sentinel, not a NULL, so the UNIQUE key below treats "the default" as a real row.
  workflow_key  text NOT NULL DEFAULT '*',
  plane         agent_plane NOT NULL,
  -- The current autonomy rung this (agent, workflow, plane) runs at. Ramping is an UPDATE here.
  rung          autonomy_rung NOT NULL DEFAULT 'L1',
  -- Orthogonal to the rung (ADR-0087 security impact): when true, the agent still funnels
  -- customer-facing / money / prod-migration / deploy / X.0.0 legs to the single human queue
  -- (the 🔒 Mark-gate) regardless of rung. An L3 + mark_gated agent is autonomous EXCEPT there.
  mark_gated    boolean NOT NULL DEFAULT false,
  -- Optional human note on why the rung is where it is (e.g. 'ramped to L2 after UAT'). Not PII.
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- One CURRENT rung per (agent, workflow, plane). Re-ramping is an upsert on this key.
  CONSTRAINT agent_autopilot_policy_uniq UNIQUE (agent_key, workflow_key, plane)
);
COMMENT ON TABLE agent_autopilot_policy IS
  'The data-driven autonomy dial for orchestration agents (#721, ADR-0087). One current autonomy rung (L0 observe | L1 draft | L2 act-gated | L3 auto) per (agent_key, workflow_key, plane) + an orthogonal mark_gated flag (🔒 customer-facing/money/prod-migration/deploy legs still funnel to the human queue regardless of rung). Ramping a rung is a DATA change, not a code change. App-native governance/control table (archetype H, horizontal domain) — the twin of agent_settings; NOT the taken autopilot_policies (mig 0038, Intune device-posture bronze). Backend orchestration agents READ this to decide their autonomy (e.g. BE #156 collections agent, today hardcoding an L1 cap). Caps: agents:operate (admin, ADR-0050/0030). No PII, no secrets, no code knowledge.';
COMMENT ON COLUMN agent_autopilot_policy.agent_key IS
  'Stable agent roster key (matches docs/agents/orchestration-matrix.md), e.g. collections | lead-response | time-payroll. Config key, not a person.';
COMMENT ON COLUMN agent_autopilot_policy.workflow_key IS
  'Workflow/work-unit the rung scopes to, or ''*'' = the agent default for every workflow. Exact workflow_key beats ''*'' on read.';
COMMENT ON COLUMN agent_autopilot_policy.mark_gated IS
  'Orthogonal to rung: when true, customer-facing/money/prod-migration/deploy/X.0.0 legs still funnel to the single human queue (🔒) regardless of rung (ADR-0087).';

-- The dial-reader resolves the rung for a given (agent, plane), preferring an exact
-- workflow_key over the '*' default — index supports that lookup.
CREATE INDEX IF NOT EXISTS idx_agent_autopilot_policy_lookup
  ON agent_autopilot_policy (agent_key, plane, workflow_key);

-- ── Grants: the web identity READS the dial (render any management surface; ADR-0042 division
--    of labor — reads-for-rendering are fine) and may WRITE it through agents:operate-gated
--    server actions. The backend reads/writes it for the orchestration agents (ADR-0087 — the
--    dial governs every tier). Pipeline does NOT touch it (app-native governance, not merged
--    data). Defensive (roles may be absent), mirroring 0121/0122's grant blocks.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON agent_autopilot_policy TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON agent_autopilot_policy TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
END $$;

COMMIT;
