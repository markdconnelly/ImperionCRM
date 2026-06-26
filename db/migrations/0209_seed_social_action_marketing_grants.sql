-- 0209: Seed the deny-by-default Social Action grants for Belle, the marketing/social channel owner
-- (#1354, FE ADR-0124 §4, epic #1338; backend BE #418 unified Social Action dispatcher, ADR-0096
-- placeholder; ADR-0081 §tool-grant rule + ADR-0109 hard money ceiling).
-- Migration number 0209 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY THIS EXISTS. FE-owned (ADR-0017/0042 §1) runtime source of truth for which Social Action
-- CATALOG KINDS the marketing agent (Belle) may run unattended on the AUTONOMOUS loop path — the
-- twin of the backend AUTONOMOUS_ACTION_GRANTS declaration (BE #418,
-- src/shared/agent/autonomous-action-grants.ts), keyed by action kind under agent_key='marketing'.
--
-- THE RULE (ADR-0081 §tool-grant). A HUMAN-approved catalog action needs NO grant — the human is
-- the gate, so POST /agent/actions/execute is unchanged. The AUTONOMOUS path is different: it turns
-- a catalog action into a loop tool, and that tool — exactly like every sub-agent NARROW NAMED tool
-- (migration 0156, ADR-0107) and the Technician/Procurement action twins (0171/0184) — requires an
-- agent_tool_grant row. The gauntlet's gate 3 (BE #285) enforces this deny-by-default. This seed is
-- the Social-Action twin of those action-catalog seeds: the runtime rows those grant checks read.
--
-- WHO OWNS IT. The marketing workspace agent — "Marketing (Belle)" in the canonical roster, the
-- social channel owner (ADR-0124). The backend resolves a grant via agent.name for module='crm'
-- (loadToolGrants, 0156/0171/0184), so the agent needs its OWN module='crm' name='marketing' anchor
-- for a grant to reference. agent.module is CHECK-constrained to crm|board (0056), so the anchor is
-- module='crm' (the Technician/Procurement precedent — the anchor's module is the resolution
-- namespace, not the business domain). This migration MATERIALIZES that row (verified absent in prod
-- before authoring).
--
-- v1 POSTURE — FAIL-CLOSED, NO WRITE GRANT (matches the BE mirror exactly): "every Social Action is
-- human-approved." All eleven Social Action kinds are WITHHELD from the autonomous path, so the
-- INSERT below lands ZERO grant rows (deny-by-default already refuses every autonomous action).
-- Two posture bands:
--   * The four MONEY/ad kinds (social_boost_post, social_ad_deploy, social_ad_pause,
--     social_ad_rebudget) are `financial` and can NEVER be granted — ADR-0109 hard money ceiling.
--   * The seven customer-facing ORGANIC kinds (the FB/IG/Threads publish+reply kinds) are
--     `client_pii` always-gate classes the gauntlet parks anyway.
-- The full posture set stays self-documenting (the 0171/0184 pattern) while emitting nothing today.
-- Modeling the anchor + postures now means a (non-money) ramp is a DATA change — a NEW migration
-- flipping a kind to 'granted' HERE and in the backend mirror, in lockstep — never a schema change.
-- Keep in LOCKSTEP with the backend AUTONOMOUS_ACTION_GRANTS mirror (BE #418) — the FE seed and that
-- list are two copies of one fact, exactly like 0156 ↔ SEEDED_TOOL_GRANTS / 0171 ↔ Technician /
-- 0184 ↔ Procurement.
--
-- Archetype H (governance/control), horizontal Audit/governance domain; twin of agent_tool_grant /
-- agent_action_autonomy / agent_settings. App-native, NOT silver, NOT pipeline-merged → no OKF
-- concept-file change: agent_tool_grant.md's authority/shape/joins are unchanged (a new agent_key
-- consumer is data, not meaning), and this is INSERT-only so the semantic-layer gate (CREATE/ALTER/
-- DROP scan) does not fire — the 0156/0163/0171/0184 precedent. Frontend-owned schema (ADR-0042).
-- No PII, no secrets. Additive, idempotent (ON CONFLICT guards), transactional. NOT prod-applied
-- until merge (each prod apply is Mark-gated, §10.3). Zero behavior change on apply (no grant rows
-- seeded; deny-by-default already refuses every autonomous Social Action).
--
-- Surface check (harmless, the 0156/0171 analysis): the board UI (src/lib/board/data.ts) filters
-- module='board' → the marketing row is hidden; icm-runs (src/lib/agent/icm-runs.ts) joins
-- agent_run → agent (only agents WITH runs surface) → a freshly-seeded row is invisible; the
-- autonomy dial resolves the conservative DEFAULT_AUTONOMY_RUNG when no policy row exists.
--
-- Grants on agent / agent_tool_grant already exist (0056). No new role grants. Idempotent throughout;
-- safe to re-run.

BEGIN;

-- ── 1. The Marketing grant anchor (module='crm', name='marketing') ────────────────────────────
-- instructions = grant-anchor note (NOT NULL); the real prompt/identity lives in the backend
-- orchestrator (ADR-0124). display_name carries the canonical persona.
INSERT INTO agent (name, module, instructions, display_name)
VALUES
  ('marketing', 'crm',
   'Marketing (Belle) workspace identity — the social channel owner (ADR-0124). Grant anchor for the unified Social Action grants (BE #418, ADR-0081 §tool-grant rule); runtime behavior lives in the backend orchestrator and mirrors AUTONOMOUS_ACTION_GRANTS (src/shared/agent/autonomous-action-grants.ts).',
   'Marketing (Belle)')
ON CONFLICT (module, name) DO NOTHING;

-- ── 2. Social Action grants (authoritative posture — mirror of BE #418) ───────────────────────
-- Every Social Action kind the marketing agent COULD reach on the autonomous loop is listed with an
-- EXPLICIT posture, the exact twin of the backend drift guard (granted OR withheld — never silent).
-- Only a 'granted' posture seeds a grant row; v1 = every posture 'withheld', so this INSERT lands
-- ZERO rows (fail-closed). The four financial kinds can NEVER be granted (ADR-0109 hard money
-- ceiling); the seven client_pii organic kinds are always-gate. A future (non-money) ramp ships a
-- NEW migration flipping a kind to 'granted' here AND in the backend mirror, in lockstep. The WHERE
-- filter keeps the full posture set self-documenting while emitting nothing today.
INSERT INTO agent_tool_grant (agent_id, tool)
SELECT a.id, g.action_kind
FROM (
  VALUES
    -- (action_kind, posture, data_class)
    -- Seven customer-facing ORGANIC kinds — client_pii always-gate (never auto-commit).
    ('social_publish_fb_post',  'withheld', 'client_pii'),   -- publish a Facebook page post
    ('social_reply_fb_comment', 'withheld', 'client_pii'),   -- reply to a Facebook comment
    ('social_publish_ig_media', 'withheld', 'client_pii'),   -- publish an Instagram media post
    ('social_reply_ig_comment', 'withheld', 'client_pii'),   -- reply to an Instagram comment
    ('social_reply_ig_direct',  'withheld', 'client_pii'),   -- reply to an Instagram direct message
    ('social_post_threads',     'withheld', 'client_pii'),   -- publish a Threads post
    ('social_reply_threads',    'withheld', 'client_pii'),   -- reply to a Threads mention/post
    -- Four MONEY/ad kinds — financial → ADR-0109 hard money ceiling, can NEVER be granted.
    ('social_boost_post',       'withheld', 'financial'),    -- boost an organic post (paid)
    ('social_ad_deploy',        'withheld', 'financial'),    -- deploy a paid ad
    ('social_ad_pause',         'withheld', 'financial'),    -- pause a paid ad
    ('social_ad_rebudget',      'withheld', 'financial')     -- change a paid ad's budget
) AS g(action_kind, posture, data_class)
JOIN agent a ON a.module = 'crm' AND a.name = 'marketing'
WHERE g.posture = 'granted'
ON CONFLICT (agent_id, tool) DO NOTHING;

COMMIT;
