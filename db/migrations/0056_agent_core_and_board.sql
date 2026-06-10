-- 0056: Agent-platform persistence + AI Board of Directors (ADR-0015, ADR-0049).
--
-- Materializes the Diagram-3 agent core the runtime can now use (the backend's
-- Claude tool-use orchestrator loop is real — backend ADR-0036/0037):
--
--   agent                — configurable definitions; module 'crm' | 'board';
--                          board personas carry persona_role. model_routing holds
--                          the TIER hint ({"tier":"cheap"|"premium"}) — the model
--                          pair itself comes from agent_settings' preset (0054);
--                          the stack is settled Claude+Voyage (ADR-0043).
--   agent_tool_grant     — per-agent tool allowlist (jsonb scope).
--   agent_run            — append-only run audit: acting user, status, tokens,
--                          cost_usd, permission_scope (ADR-0016: an agent never
--                          exceeds the invoking user's permissions).
--   agent_message        — per-run transcript (role, content, tool_calls).
--   agent_memory         — durable memory; vector(1024) under the SAME pinned
--                          contract as knowledge_embedding (0045): Voyage
--                          voyage-3-large @ 1024, provenance columns required.
--   board_session        — convened deliberation (opened_by, topic, status).
--   board_session_member — which personas sit this session.
--   board_message        — the deliberation transcript (persona turns; a NULL
--                          agent_id row is the orchestrator/synthesis voice).
--   board_recommendation — the session's synthesized outcome (one per session).
--
-- The Board is the same core with module='board' and is WALLED OFF from CRM
-- operational writes: board agents read granted business context only. Five
-- starter personas are seeded (editable in-app later; ON CONFLICT-guarded).
--
-- Grants: backend MI does all writes (the runtime); web reads for rendering.
-- Neither pipeline identity gets access. No DELETE anywhere (append-only audit).
-- Idempotent throughout.

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Agent definitions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  module         text NOT NULL CHECK (module IN ('crm', 'board')),
  instructions   text NOT NULL,
  model_routing  jsonb NOT NULL DEFAULT '{}'::jsonb,
  persona_role   text,                       -- board personas only (e.g. 'CFO')
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, name)
);

COMMENT ON TABLE agent IS
  'Configurable agent definitions (ADR-0015). module=board rows are the AI Board personas, walled off from CRM writes.';

CREATE TABLE IF NOT EXISTS agent_tool_grant (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id  uuid NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  tool      text NOT NULL,
  scope     jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (agent_id, tool)
);

-- ── Run audit (append-only) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_run (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          uuid NOT NULL REFERENCES agent(id),
  acting_user_id    uuid REFERENCES app_user(id),
  status            text NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running', 'succeeded', 'failed', 'cancelled')),
  tokens            integer NOT NULL DEFAULT 0,
  cost_usd          numeric(10, 4) NOT NULL DEFAULT 0,
  permission_scope  jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_run_agent   ON agent_run (agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_run_user    ON agent_run (acting_user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS agent_message (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES agent_run(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content     text NOT NULL DEFAULT '',
  tool_calls  jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_message_run ON agent_message (run_id, created_at);

-- ── Agent memory (pinned vector contract, 0045 pattern) ───────────────────────
CREATE TABLE IF NOT EXISTS agent_memory (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          uuid NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('fact', 'summary')),
  content           text NOT NULL,
  embedding         vector(1024),
  embedding_model   text,
  dimension         integer,
  chunking_version  text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_memory (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_vec
  ON agent_memory USING hnsw (embedding vector_cosine_ops);

-- ── AI Board of Directors ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_session (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by     uuid NOT NULL REFERENCES app_user(id),
  topic         text NOT NULL,
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'deliberating', 'concluded', 'failed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  concluded_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_board_session_opened ON board_session (created_at DESC);

CREATE TABLE IF NOT EXISTS board_session_member (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES board_session(id) ON DELETE CASCADE,
  agent_id    uuid NOT NULL REFERENCES agent(id),
  UNIQUE (session_id, agent_id)
);

CREATE TABLE IF NOT EXISTS board_message (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES board_session(id) ON DELETE CASCADE,
  agent_id    uuid REFERENCES agent(id),   -- NULL = orchestrator/synthesis voice
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_message_session ON board_message (session_id, created_at);

CREATE TABLE IF NOT EXISTS board_recommendation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL UNIQUE REFERENCES board_session(id) ON DELETE CASCADE,
  recommendation  text NOT NULL,
  rationale       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Starter board personas (editable in-app; insert-once) ─────────────────────
INSERT INTO agent (name, module, instructions, model_routing, persona_role)
VALUES
  ('Chief Executive', 'board',
   'You are the CEO persona on an MSP''s AI board of directors. Weigh every question against long-term strategy, market position, client trust, and focus. Challenge proposals that dilute the core managed-services business. Be decisive; state a clear position and what evidence would change it.',
   '{"tier":"premium"}'::jsonb, 'CEO'),
  ('Chief Financial Officer', 'board',
   'You are the CFO persona on an MSP''s AI board of directors. Evaluate proposals for cash-flow impact, margin, recurring-revenue quality, pricing discipline, and risk-adjusted return. Quantify wherever the provided context allows; name the assumptions you had to make.',
   '{"tier":"premium"}'::jsonb, 'CFO'),
  ('Chief Operating Officer', 'board',
   'You are the COO persona on an MSP''s AI board of directors. Judge operational feasibility: service-delivery capacity, onboarding load, tooling, process maturity, and the runbook reality behind any commitment. Surface the operational failure modes others gloss over.',
   '{"tier":"premium"}'::jsonb, 'COO'),
  ('Chief Marketing Officer', 'board',
   'You are the CMO persona on an MSP''s AI board of directors. Assess demand generation, positioning, segment fit, and client lifecycle impact. Ground arguments in the pipeline and engagement context provided; flag where the data is too thin to support a growth claim.',
   '{"tier":"premium"}'::jsonb, 'CMO'),
  ('Chief Information Security Officer', 'board',
   'You are the CISO persona on an MSP''s AI board of directors. Evaluate everything for security posture, client-data exposure, compliance obligations, and the threat model of an MSP under continuous attack. Least privilege and Zero Trust are non-negotiable defaults.',
   '{"tier":"premium"}'::jsonb, 'CISO')
ON CONFLICT (module, name) DO NOTHING;

-- ── Least-privilege grants (0050/0052/0054 defensive pattern) ──────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    -- The runtime: writes runs/messages/memory/board rows; updates agent configs.
    GRANT SELECT, INSERT, UPDATE ON
      agent, agent_tool_grant, agent_run, agent_message, agent_memory,
      board_session, board_session_member, board_message, board_recommendation
    TO "mgid-imperioncrmbackendfunction";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    -- The GUI: renders; all writes go through the backend (ADR-0042).
    GRANT SELECT ON
      agent, agent_tool_grant, agent_run, agent_message, agent_memory,
      board_session, board_session_member, board_message, board_recommendation
    TO "mgid-imperioncrm-web-prd";
  END IF;
  -- Pipeline identities get no access — the agent layer is not their concern.
END $$;

COMMIT;
