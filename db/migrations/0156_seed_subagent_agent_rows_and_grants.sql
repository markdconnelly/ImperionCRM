-- 0156: Seed sub-agent `agent` rows + their tool grants (#993, 2B-0 — ADR-0107).
--
-- FOUNDATION, DORMANT. This is the shared substrate for BOTH the governed
-- action/tool-grant plane (#990: deny-by-default egress) and the native 1–5
-- autonomy dial (#996 / ADR-0107 D4) — both need a per-sub-agent `agent` row
-- to hang grants and an autonomy level on.
--
-- Why this is needed: `agent_tool_grant.agent_id → agent(id)`, but until now the
-- `agent` table (0056/0059) held ONLY `module='board'` personas. The CRM
-- sub-agents (crm, autotask, …) were pure code registrations (backend
-- `SUB_AGENTS` union + registry.ts), so a grant had nothing to reference and a
-- grant check was impossible. This migration materializes the 9 registered
-- sub-agents as `module='crm'` rows and seeds their tool allowlist.
--
-- DORMANT by design: NOTHING reads agent_tool_grant yet. Enforcement (deny-by-
-- default at tool dispatch) is BE #244 / 2B-1, which must deploy ONLY AFTER this
-- seed is prod-applied — otherwise fail-closed enforcement blocks every tool.
-- Runtime behavior stays in code; these rows are config anchors, not a new
-- execution path. Zero behavior change on apply.
--
-- Surface check (verified harmless before authoring):
--   - board UI (src/lib/board/data.ts) filters module='board' → crm rows hidden.
--   - icm-runs (src/lib/agent/icm-runs.ts) joins agent_run → agent; only agents
--     WITH runs surface → freshly-seeded rows (no runs) are invisible.
--   - autonomy-dial (src/lib/autonomy-dial.ts) resolves to the conservative
--     DEFAULT_AUTONOMY_RUNG when no agent_autopilot_policy row exists.
--
-- `search_knowledge` is an orchestrator-GLOBAL tool (not sub-agent-scoped) and is
-- deliberately OMITTED — it is exempt from per-agent grants.
--
-- Grants on `agent` / `agent_tool_grant` already exist (0056). No new role grants.
-- Idempotent throughout (ON CONFLICT guards); safe to re-run.

BEGIN;

-- ── 1. Sub-agent definitions (module='crm', name = SubAgentName) ──────────────
-- instructions = grant-anchor note (NOT NULL); the real prompt lives in code.
-- model_routing left at table default ('{}') — tier hint stays a code/runtime
-- concern (0056 contract), not seeded here.
INSERT INTO agent (name, module, instructions)
VALUES
  ('crm',           'crm', 'CRM sub-agent. Grant anchor for the governed tool-grant plane (ADR-0107); runtime behavior is in the backend registry.'),
  ('autotask',      'crm', 'Autotask sub-agent. Grant anchor for the governed tool-grant plane (ADR-0107); runtime behavior is in the backend registry.'),
  ('documentation', 'crm', 'Documentation sub-agent. Grant anchor for the governed tool-grant plane (ADR-0107); runtime behavior is in the backend registry.'),
  ('itglue',        'crm', 'IT Glue sub-agent. Grant anchor for the governed tool-grant plane (ADR-0107); runtime behavior is in the backend registry.'),
  ('m365',          'crm', 'Microsoft 365 sub-agent. Grant anchor for the governed tool-grant plane (ADR-0107); runtime behavior is in the backend registry.'),
  ('plaud',         'crm', 'Plaud sub-agent. Grant anchor for the governed tool-grant plane (ADR-0107); runtime behavior is in the backend registry.'),
  ('advisor',       'crm', 'Advisor sub-agent. Grant anchor for the governed tool-grant plane (ADR-0107); runtime behavior is in the backend registry.'),
  ('reporting',     'crm', 'Reporting sub-agent (generic delegate). Grant anchor for the governed tool-grant plane (ADR-0107); runtime behavior is in the backend registry.'),
  ('sales',         'crm', 'Sales sub-agent (generic delegate). Grant anchor for the governed tool-grant plane (ADR-0107); runtime behavior is in the backend registry.')
ON CONFLICT (module, name) DO NOTHING;

-- ── 2. Tool grants (authoritative matrix, #993) ──────────────────────────────
-- Join each (agent_name, tool) pair to its module='crm' agent row by name.
INSERT INTO agent_tool_grant (agent_id, tool)
SELECT a.id, g.tool
FROM (
  VALUES
    -- crm
    ('crm',           'crm_search_accounts'),
    ('crm',           'crm_search_contacts'),
    ('crm',           'crm_get_contact'),
    ('crm',           'crm_search_opportunities'),
    ('crm',           'crm_create_task'),
    ('crm',           'crm_add_note'),
    -- autotask
    ('autotask',      'autotask_search_tickets'),
    ('autotask',      'autotask_get_ticket'),
    ('autotask',      'autotask_add_triage_note'),
    -- documentation
    ('documentation', 'docs_search_knowledge'),
    ('documentation', 'docs_draft_article'),
    -- itglue
    ('itglue',        'itglue_list_organizations'),
    ('itglue',        'itglue_search_configurations'),
    ('itglue',        'itglue_get_configuration'),
    ('itglue',        'itglue_search_docs'),
    -- m365
    ('m365',          'm365_recent_comms'),
    ('m365',          'm365_search_comms'),
    ('m365',          'm365_upcoming_meetings'),
    -- plaud
    ('plaud',         'plaud_list_recordings'),
    ('plaud',         'plaud_get_note'),
    ('plaud',         'plaud_get_transcript'),
    -- advisor
    ('advisor',       'advisor_list'),
    ('advisor',       'advisor_consult'),
    -- reporting (generic delegate — no narrow tools)
    ('reporting',     'agent_reporting'),
    -- sales (generic delegate — no narrow tools)
    ('sales',         'agent_sales')
) AS g(agent_name, tool)
JOIN agent a ON a.module = 'crm' AND a.name = g.agent_name
ON CONFLICT (agent_id, tool) DO NOTHING;

COMMIT;
