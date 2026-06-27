-- 0217: agent_action_catalog — the kind-keyed action catalog with the ADR-0128 ladder tags
-- (auto_at_level + always_gate). Implements #1412 (epic #1038 / master epic #1491), ADR-0128.
-- Migration number 0217 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash.
--
-- WHY THIS EXISTS. ADR-0128 pins the canonical L0–L5 autonomy ladder and a per-action rule:
-- an action auto-executes IFF `dial >= auto_at_level AND NOT always_gate AND the gauntlet
-- passes` (D4), enforced by gauntlet gate 7 (actuation_level) + gate 8 (hard_ceiling). The
-- per-action `auto_at_level` / `always_gate` tags are FE-owned catalog metadata
-- (src/lib/agent/action-catalog.ts, ADR-0042 §1). The BACKEND gauntlet must read those tags
-- at dispatch (BE #435) but cannot import FE code (repos don't share code) — so this migration
-- MATERIALIZES the catalog as a queryable, kind-keyed table the backend resolves by `kind`,
-- exactly like the FE↔BE twins 0156 (SEEDED_TOOL_GRANTS) and 0209 (Belle Social-Action grants).
-- It is the DB copy of one fact whose source of truth is the FE catalog; keep the two in
-- LOCKSTEP — a new catalog kind, or a changed tag, is a paired edit (this seed + the TS catalog).
--
-- WHAT auto_at_level / always_gate MEAN (ADR-0128 D2/D3):
--   * auto_at_level (0–5) — the minimum ladder rung at which the action auto-executes; below it
--     it parks. It is the action's inherent risk floor, NOT the operator's dial setting.
--   * always_gate — the DIAL-PROOF hard ceiling: never auto-executes at any level. Reserved for
--     external commitments that bind the company + the hard money ceiling (ADR-0109). The
--     always-gate data_classes (financial / security_credentials / client_pii, ADR-0118) are
--     enforced SEPARATELY by the data-class ceiling (data_class.always_gate, mig 0175) and are
--     NOT duplicated onto always_gate here — so the four `financial` money kinds below DO set
--     always_gate=true (the explicit money ceiling) while the client_pii organic kinds do not
--     (their ceiling is the data-class gate, which the gauntlet evaluates independently).
--
-- Archetype H (governance/control), horizontal Audit/governance domain — twin of
-- agent_action_autonomy / agent_tool_grant / agent_settings / agent_governance_setting.
-- App-native config; NOT silver, NOT pipeline-merged → no OKF concept file
-- (semantic-layer-not-affected, the 0158/0163/0209 precedent). Frontend-owned schema
-- (ADR-0042). No PII, no secrets (action kinds + labels + non-sensitive tags). Additive,
-- idempotent, transactional. NOT prod-applied until the orchestrator/Mark runs it (each prod
-- apply is Mark-gated, §10.3).

BEGIN;

-- ── agent_action_catalog: the kind-keyed registry the backend gauntlet reads at dispatch ─────
CREATE TABLE IF NOT EXISTS agent_action_catalog (
  -- Catalog key = the `kind` on the execute payload (= ActionDef.kind in the FE catalog).
  kind          text PRIMARY KEY,
  label         text NOT NULL,
  -- ADR-0055 tier (T0–T3) — drives the legacy 1–5 dial→tier ceiling (unchanged plane).
  tier          text NOT NULL CHECK (tier IN ('T0','T1','T2','T3')),
  -- ADR-0016/0118 data-sensitivity class. The always-gate classes (financial /
  -- security_credentials / client_pii) carry their own ceiling via data_class.always_gate (0175).
  data_class    text NOT NULL
                  CHECK (data_class IN
                    ('operational','financial','people_hr','security_credentials','client_pii')),
  -- ADR-0014/0058 consent class — whether the backend re-checks contact consent at execution.
  consent_class text NOT NULL DEFAULT 'none'
                  CHECK (consent_class IN ('none','contact_channel')),
  -- ADR-0128 D3: the minimum ladder rung (L0–L5) at which this action auto-executes.
  auto_at_level smallint NOT NULL CHECK (auto_at_level BETWEEN 0 AND 5),
  -- ADR-0128 D2/D3: the dial-proof hard ceiling (external commitment / money). Never auto-runs.
  always_gate   boolean NOT NULL DEFAULT false,
  -- The backend executor binding name (documentation/audit; the backend owns dispatch).
  executor      text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE agent_action_catalog IS
  'Kind-keyed action catalog with the ADR-0128 ladder tags (auto_at_level + always_gate). The '
  'DB twin of the FE action-catalog (src/lib/agent/action-catalog.ts) the backend gauntlet '
  'reads at dispatch to apply the D4 rule (auto IFF dial>=auto_at_level AND NOT always_gate AND '
  'gauntlet passes; gate 7 + gate 8). FE-owned source of truth (ADR-0042); keep in lockstep '
  'with the TS catalog. App-native config (archetype H). No PII, no secrets.';
COMMENT ON COLUMN agent_action_catalog.auto_at_level IS
  'ADR-0128 D3: minimum ladder rung (0–5) at which the action auto-executes; below it it parks. '
  'The action''s inherent risk floor, NOT the operator dial.';
COMMENT ON COLUMN agent_action_catalog.always_gate IS
  'ADR-0128 D2: dial-proof hard ceiling — never auto-executes at any level (external commitments '
  '+ the ADR-0109 money ceiling). Distinct from the data-class ceiling (data_class.always_gate, '
  'mig 0175), which the gauntlet evaluates separately.';

-- ── Seed the 15 registered catalog kinds (LOCKSTEP with action-catalog.ts REGISTRY) ──────────
INSERT INTO agent_action_catalog (kind, label, tier, data_class, consent_class, auto_at_level, always_gate, executor) VALUES
  -- 1:1 contact comms — L3 (standard external touch); client_pii ceiling parks them in v1.
  ('send_email',              'Send email',                'T2', 'client_pii', 'contact_channel', 3, false, 'comms_send'),
  ('send_sms',                'Send SMS',                  'T2', 'client_pii', 'contact_channel', 3, false, 'comms_send'),
  -- Threads (own presence broadcast) — operational, L5 (max-only); not a commitment.
  ('publish_threads',         'Publish Threads post',      'T3', 'operational', 'none',           5, false, 'threads_publish'),
  ('reply_threads',           'Reply on Threads',          'T3', 'operational', 'none',           5, false, 'threads_publish'),
  -- Social organic broadcasts/replies — client_pii, L5; data-class ceiling gates them.
  ('social_publish_fb_post',  'Publish Facebook post',     'T3', 'client_pii', 'none',            5, false, 'social_dispatch'),
  ('social_reply_fb_comment', 'Reply to Facebook comment', 'T3', 'client_pii', 'none',            5, false, 'social_dispatch'),
  ('social_publish_ig_media', 'Publish Instagram media',   'T3', 'client_pii', 'none',            5, false, 'social_dispatch'),
  ('social_reply_ig_comment', 'Reply to Instagram comment','T3', 'client_pii', 'none',            5, false, 'social_dispatch'),
  ('social_reply_ig_direct',  'Reply to Instagram DM',     'T3', 'client_pii', 'none',            5, false, 'social_dispatch'),
  ('social_post_threads',     'Publish Threads post',      'T3', 'client_pii', 'none',            5, false, 'social_dispatch'),
  ('social_reply_threads',    'Reply on Threads',          'T3', 'client_pii', 'none',            5, false, 'social_dispatch'),
  -- Money / ad kinds — financial, DIAL-PROOF hard money ceiling (ADR-0109): always_gate=true.
  ('social_boost_post',       'Boost post (paid)',         'T3', 'financial', 'none',             5, true,  'social_dispatch'),
  ('social_ad_deploy',        'Deploy paid ad',            'T3', 'financial', 'none',             5, true,  'social_dispatch'),
  ('social_ad_pause',         'Pause paid ad',             'T3', 'financial', 'none',             5, true,  'social_dispatch'),
  ('social_ad_rebudget',      'Rebudget paid ad',          'T3', 'financial', 'none',             5, true,  'social_dispatch')
ON CONFLICT (kind) DO UPDATE
  SET label         = EXCLUDED.label,
      tier          = EXCLUDED.tier,
      data_class    = EXCLUDED.data_class,
      consent_class = EXCLUDED.consent_class,
      auto_at_level = EXCLUDED.auto_at_level,
      always_gate   = EXCLUDED.always_gate,
      executor      = EXCLUDED.executor,
      updated_at    = now();

-- ── Grants: web SELECT (the catalog/dial legend + cockpit labels render it, ADR-0042); backend
--    SELECT (resolve auto_at_level/always_gate at dispatch, BE #435). Pipeline untouched.
--    Defensive (roles may be absent), per the 0158/0163 pattern.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON agent_action_catalog TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grant.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON agent_action_catalog TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grant.';
  END IF;
END $$;

COMMIT;
