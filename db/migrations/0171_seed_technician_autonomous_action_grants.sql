-- 0171: Seed the Technician's autonomous-path action grants (#1193, ADR-0081 §tool-grant rule).
-- Migration number 0171 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY THIS EXISTS. FE-owned (ADR-0017/0042 §1) runtime source of truth for which CATALOG ACTIONS
-- the Technician (Felix) may run unattended on the AUTONOMOUS loop path — the twin of the backend
-- AUTONOMOUS_ACTION_GRANTS declaration (BE #257, src/shared/agent/autonomous-action-grants.ts),
-- keyed by action kind under agent_key='technician' (backend TECHNICIAN_AGENT_KEY).
--
-- THE RULE (ADR-0081 §tool-grant). A HUMAN-approved catalog action needs NO grant — the human is
-- the gate, so POST /agent/actions/execute is unchanged. The AUTONOMOUS path is different: it turns
-- a catalog action into a loop tool, and that tool — exactly like every sub-agent NARROW NAMED tool
-- (migration 0156, ADR-0107) — requires an agent_tool_grant row. The gauntlet's gate 3 (BE #285)
-- enforces this deny-by-default. This seed is the action-catalog twin of the 0156 sub-agent
-- tool-grant seed: the runtime rows those grant checks read.
--
-- WHY A SEPARATE ANCHOR ROW. The 0156 rows hold sub-agents' NARROW tools (read/triage). The
-- Technician's autonomous WRITE actions are CATALOG ACTIONS reached only on the autonomous path,
-- under a DISTINCT key agent_key='technician' — separate from the 'autotask' sub-agent (which
-- carries display_name 'Autotask Technician' but is the narrow-tools read/triage identity,
-- 0156/0163). The backend resolves a grant via agent.name for module='crm' (loadToolGrants), so the
-- Technician needs its OWN module='crm' name='technician' anchor row for a grant to reference.
-- This migration MATERIALIZES that row (verified absent in prod before authoring).
--
-- v1 POSTURE — FAIL-CLOSED, NO WRITE GRANT (matches the BE mirror exactly). All three Autotask
-- write actions are WITHHELD from the autonomous path:
--   * autotask_post_reply    — customer-facing (client_pii), an always-gate class → never auto-commits
--   * autotask_log_time      — financial, an always-gate class → never auto-commits
--   * autotask_update_ticket — operational; held conservatively until the actuation dial (0158) +
--                              the grounding re-check are wired (a future ramp grants THIS one first)
-- Comms sends (send_email/send_sms) are not Technician actions and are likewise never granted here.
-- So this seed inserts ZERO grant rows in v1 — fully fail-closed by design. The agent_key='technician'
-- modeling LANDS now so a future ramp is a DATA change (a new migration inserting one grant row),
-- never a schema change. Keep in LOCKSTEP with the backend AUTONOMOUS_ACTION_GRANTS mirror (BE #257) —
-- the FE seed and that list are two copies of one fact, exactly like 0156 ↔ SEEDED_TOOL_GRANTS.
--
-- Archetype H (governance/control), horizontal Audit/governance domain; twin of agent_tool_grant /
-- agent_action_autonomy / agent_settings. App-native, NOT silver, NOT pipeline-merged → no OKF
-- concept-file change: agent_tool_grant.md's authority/shape/joins are unchanged (a new agent_key
-- consumer is data, not meaning), and this is INSERT-only so the semantic-layer gate (CREATE/ALTER/
-- DROP scan) does not fire — semantic-layer-not-affected, the 0156/0158/0163 precedent. Frontend-
-- owned schema (ADR-0042). No PII, no secrets. Additive, idempotent (ON CONFLICT guards),
-- transactional. NOT prod-applied until merge (each prod apply is Mark-gated, §10.3). Zero behavior
-- change on apply (no grant rows seeded; deny-by-default already refuses every autonomous action).
--
-- Surface check (harmless, the 0156 analysis): the board UI (src/lib/board/data.ts) filters
-- module='board' → the technician row is hidden; icm-runs (src/lib/agent/icm-runs.ts) joins
-- agent_run → agent (only agents WITH runs surface) → a freshly-seeded row is invisible; the
-- autonomy dial resolves the conservative DEFAULT_AUTONOMY_RUNG when no policy row exists.
--
-- Grants on agent / agent_tool_grant already exist (0056). No new role grants. Idempotent throughout;
-- safe to re-run.

BEGIN;

-- ── 1. The Technician grant anchor (module='crm', name='technician') ──────────────────────────
-- instructions = grant-anchor note (NOT NULL); the real prompt/identity lives in the backend
-- orchestrator (ADR-0080/0081). display_name distinguishes the autonomous Technician from the
-- 'autotask' read/triage sub-agent that ALSO reads 'Autotask Technician' (0163).
INSERT INTO agent (name, module, instructions, display_name)
VALUES
  ('technician', 'crm',
   'Technician (Felix) autonomous-loop identity. Grant anchor for the autonomous-path action grants (ADR-0081 §tool-grant rule); runtime behavior lives in the backend orchestrator and mirrors AUTONOMOUS_ACTION_GRANTS (BE #257).',
   'Technician (Felix)')
ON CONFLICT (module, name) DO NOTHING;

-- ── 2. Autonomous action grants (authoritative posture — mirror of BE #257) ───────────────────
-- Every catalog action the Technician COULD reach on the autonomous loop is listed with an EXPLICIT
-- posture, the exact twin of the backend drift guard (granted OR withheld — never silent). Only a
-- 'granted' posture seeds a grant row; v1 = every posture 'withheld', so this INSERT lands ZERO rows
-- (fail-closed). A future ramp ships a NEW migration that flips an action to 'granted' here AND in
-- the backend mirror, in lockstep (autotask_update_ticket is first in line). The WHERE filter keeps
-- the full posture set self-documenting while emitting nothing today.
INSERT INTO agent_tool_grant (agent_id, tool)
SELECT a.id, g.action_kind
FROM (
  VALUES
    -- (action_kind, posture)
    ('autotask_update_ticket', 'withheld'),  -- operational; held until actuation dial + grounding re-check
    ('autotask_post_reply',    'withheld'),  -- client_pii, customer-facing → always-gate
    ('autotask_log_time',      'withheld'),  -- financial → always-gate
    ('send_email',             'withheld'),  -- comms send — human-approved only, not a Technician action
    ('send_sms',               'withheld')   -- comms send — human-approved only, not a Technician action
) AS g(action_kind, posture)
JOIN agent a ON a.module = 'crm' AND a.name = 'technician'
WHERE g.posture = 'granted'
ON CONFLICT (agent_id, tool) DO NOTHING;

COMMIT;
