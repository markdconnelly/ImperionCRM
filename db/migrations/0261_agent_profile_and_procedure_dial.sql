-- 0261: agent-profile DB source-of-truth + the per-procedure autonomy dial (FE #1832,
-- epic #1829). Implements the schema of ADR-0143 (agent profile = DB SoT; ICM reflects)
-- and ADR-0141 (the per-procedure dial is the only dial).
--
-- Migration number 0261 claimed at MERGE per system CLAUDE.md §10.3 — authored against the
-- free number at authoring; the rebased branch takes the next free number just before squash
-- (a sibling is concurrently merging factory-golden migrations in the 0260+ range).
--
-- WHY THIS EXISTS. The Agent GUI rework moves the full agent profile — identity, org
-- placement, avatar, AND the persona narrative — into the database as the single authority
-- (ADR-0143), and consolidates the three overlapping autonomy-dial configs into ONE dial per
-- (agent, procedure) (ADR-0141). This migration delivers the four FE-owned schema objects those
-- ADRs specify (the backend gauntlet/dispatcher + LocalPipeline vectorizer are the consumers,
-- ADR-0042):
--
--   1. agent_procedure_policy  — the ONE dial: a (agent_key, procedure_key) row carrying a 1–5
--                                `level` + an `enabled` boolean (light-up-as-built). ADR-0141 D1.
--   2. agent_profile           — the DB-authoritative identity/org/avatar record. ADR-0143 D1.
--   3. agent_persona_section   — the six persona-narrative sections (a persona .md reconstructs
--                                losslessly from rows), vectorized into the brain by LP. ADR-0143 D1/D4.
--   4. procedure_human_owner   — the procedure-scoped responsible human + approver set (feeds the
--                                Teams @mentions, verdict-side authorization, reject-task
--                                assignee). ADR-0143 D1 / ADR-0142.
--
-- ADDITIVE-ONLY (scope constraint, #1832). This migration does NOT drop or alter
-- `agent_action_autonomy` (mig 0158) or `agent_autopilot_policy` (mig 0123): the BACKEND
-- dispatcher still reads `agent_action_autonomy` in prod (live dial rows; a pending activation
-- flow writes it), so retiring it here would break the running gauntlet. The new
-- `agent_procedure_policy` is created ALONGSIDE the old dial tables; ADR-0141 D6's retirement of
-- `agent_action_autonomy` + the reshape/replace of `agent_autopilot_policy` is a SEPARATE
-- follow-up FE migration, explicitly sequenced AFTER the backend dispatcher swap
-- (ImperionCRM_Backend#514). Both dials coexist harmlessly until then.
--
-- ARCHETYPE. All four are archetype H (reference / config / governance / control) per the
-- data-and-automation-doctrine — app-native control tables in the horizontal Audit/governance
-- domain, twins of agent_action_autonomy / agent_autopilot_policy / agent_action_catalog /
-- agent_governance_setting / agent_settings. NOT silver, NOT pipeline-merged → NO OKF concept
-- file (semantic-layer-not-affected — the 0123/0158/0163/0217 precedent).
--
-- RLS. The sibling agent-plane governance tables (0123/0158/0163/0217) do NOT enable row-level
-- security — access is role-based via explicit GRANTs (least privilege, ADR-0127). This migration
-- mirrors that posture exactly: no ENABLE ROW LEVEL SECURITY; the web role gets the writes the
-- admin GUI needs (allowlist, ADR-0143 D6), the backend gets the reads/writes its dispatch +
-- verdict paths need, Pipeline is untouched.
--
-- PII / SECRETS. No secrets, ever. No client PII: agent_profile carries an AGENT's identity
-- (display_name, role_title, division) — not a person's; `human_counterpart` is a UPN (a
-- corporate identifier, the same class already stored in updated_by / app_user), and
-- procedure_human_owner.owner + .approvers are UPNs. Persona narrative (agent_persona_section)
-- is agent voice/mandate prose — no client data. Avatars are agent portraits (bytea), not people.
--
-- Additive, idempotent (BEGIN/COMMIT + IF NOT EXISTS + ON CONFLICT), transactional. Frontend-owned
-- schema (ADR-0042). NOT prod-applied until the orchestrator/Mark runs it (each prod apply is
-- Mark-gated, §10.3).

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- 1. agent_procedure_policy — the ONE dial (ADR-0141 D1/D2)
-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- Autonomy is set on exactly one surface: a row per (agent_key, procedure_key) carrying the
-- ADR-0128 ladder `level` (1–5) + `enabled` (light-up-as-built; a disabled procedure NEVER
-- executes and is excluded from the agent's autonomy score, ADR-0141 D2/D5). There is NO
-- agent-level master dial. Procedure keys are agent-scoped (an org-graph procedure `slug` /
-- SOP `id` is owned by exactly one agent — src/data/agent-procedures.json nests procedures under
-- agents.<agent_key>.procedures[].slug), so the key is the (agent_key, procedure_key) pair.
CREATE TABLE IF NOT EXISTS agent_procedure_policy (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable agent roster key (matches src/data/org-graph.json / agent-procedures.json + the ICM
  -- agent slug, e.g. 'belle', 'chase', 'orchestrator'). Config key, not a person — no PII.
  agent_key      text NOT NULL,
  -- The procedure this dial scopes to — the agent-scoped procedure slug / SOP id (e.g.
  -- 'social-inbox', 'context-memory-mgmt'). Unique WITHIN an agent, hence the composite key below.
  procedure_key  text NOT NULL,
  -- The ADR-0128 ladder rung (L1–L5) this procedure runs at. ADR-0141 default is 1 (the lowest
  -- dial rung — propose/park; L0 observe is the implicit floor below the dial). Ramping is an UPDATE.
  level          smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  -- Light-up-as-built (ADR-0141 D2): a procedure is DARK until an operator turns it on. A disabled
  -- procedure never executes (an inbound wake parks/declines) and contributes nothing to the score.
  enabled        boolean NOT NULL DEFAULT false,
  -- Optional human note on why the dial is where it is (e.g. 'enabled at L2 after UAT'). Not PII.
  note           text,
  -- UPN of the last operator to set the dial (audit; the admin GUI stamps it). Not a secret.
  updated_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- ONE dial per (agent, procedure). Setting the dial is an upsert on this key (ADR-0141 D1).
  CONSTRAINT agent_procedure_policy_uniq UNIQUE (agent_key, procedure_key)
);
COMMENT ON TABLE agent_procedure_policy IS
  'The ONE autonomy dial (ADR-0141 D1): one row per (agent_key, procedure_key) carrying a 1–5 '
  'level (the ADR-0128 ladder rung, default 1) + an enabled boolean (light-up-as-built, default '
  'false — a disabled procedure NEVER executes and is excluded from the agent autonomy score, D2/D5). '
  'There is NO agent-level master dial. The backend gauntlet/dispatcher resolves the running plan''s '
  'procedure and reads this for the fire rule (auto IFF enabled AND level>=action.auto_at_level AND '
  'NOT action.always_gate AND the gauntlet passes, D4; BE #514). Created ALONGSIDE the retiring '
  'agent_autopilot_policy (0123)/agent_action_autonomy (0158) — those are dropped in a follow-up '
  'after the BE dispatcher swap (ADR-0141 D6). App-native governance/control table (archetype H, '
  'horizontal Audit/governance domain). Caps: agents:operate (admin). No PII, no secrets.';
COMMENT ON COLUMN agent_procedure_policy.agent_key IS
  'Stable agent roster key (matches org-graph.json / agent-procedures.json / the ICM agent slug), e.g. belle | chase | orchestrator. Config key, not a person.';
COMMENT ON COLUMN agent_procedure_policy.procedure_key IS
  'Agent-scoped procedure slug / SOP id (e.g. social-inbox). Unique within an agent — hence UNIQUE(agent_key, procedure_key).';
COMMENT ON COLUMN agent_procedure_policy.level IS
  'ADR-0128 ladder rung 1–5 for this procedure (default 1). L0 observe is the implicit floor below the dial.';
COMMENT ON COLUMN agent_procedure_policy.enabled IS
  'Light-up-as-built (ADR-0141 D2): false = dark (never executes, excluded from the score). Orthogonal to level.';

-- The dispatcher resolves the dial for the running plan's (agent, procedure); the UNIQUE index
-- above already covers that exact lookup. This partial index accelerates the autonomy-score
-- rollup + the card grid, which sum/scan only ENABLED rows per agent (ADR-0141 D5).
CREATE INDEX IF NOT EXISTS idx_agent_procedure_policy_enabled
  ON agent_procedure_policy (agent_key) WHERE enabled;

-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- 2. agent_profile — the DB-authoritative identity / org / avatar record (ADR-0143 D1)
-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- The source of truth for an agent's profile. The icm/ persona files + org.yaml human map become
-- a GENERATED reflection of these rows (ADR-0143 D2/D3, DB wins on drift). agent_key is the PK —
-- one profile per agent.
CREATE TABLE IF NOT EXISTS agent_profile (
  -- Stable agent roster key (the org-graph / ICM slug). One profile per agent → natural PK.
  agent_key         text PRIMARY KEY,
  -- The agent's human-readable name (the persona, e.g. 'Belle', 'Nova'). Agent identity, not a person.
  display_name      text NOT NULL,
  -- Role/title on the org chart (e.g. 'Marketing agent', 'Orchestrator'). Not PII.
  role_title        text,
  -- Org division / workspace the agent belongs to (e.g. 'marketing', 'executive'). Not PII.
  division          text,
  -- The agent_key this agent reports to on the org chart (ADR-0135 org tree). Self-referential by
  -- convention (a slug, not an FK — the roster is file-defined and seeded, not a closed table yet).
  reports_to        text,
  -- Lifecycle status of the agent in the workforce. Default 'active'; CHECK bounds the vocabulary.
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'deferred', 'retired')),
  -- Optional build/display priority rank (ADR-0141/epic #1829 priority ordering); NULL = unranked.
  priority_rank     smallint,
  -- The human counterpart this agent maps to (a UPN, ADR-0143 — feeds the org.yaml human map + the
  -- Teams rail default owner). A corporate identifier, not client PII.
  human_counterpart text,
  -- Agent portrait bytes (ADR-0143 D5 — served via the public /api/public/agent-avatar/[agent_key]
  -- route; initials fallback when NULL). An agent image, not a person; small, no blob service in v1.
  avatar            bytea,
  -- MIME type of the avatar bytes (e.g. 'image/png'); NULL iff avatar is NULL.
  avatar_mime       text,
  -- Monotonic profile version (bumped on each DB edit; feeds the bot-PR diff + drift, ADR-0143 D3).
  version           integer NOT NULL DEFAULT 1,
  -- When this profile version became current (a future temporal/SCD view; v1 uses it for drift).
  valid_from        timestamptz NOT NULL DEFAULT now(),
  -- Content hash of the current profile+persona (ADR-0143 D3 drift detector keys off this; DB wins).
  content_hash      text,
  -- UPN of the last admin-GUI editor (audit). Not a secret.
  updated_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- avatar and its MIME travel together — both set or both null.
  CONSTRAINT agent_profile_avatar_mime_chk
    CHECK ((avatar IS NULL) = (avatar_mime IS NULL))
);
COMMENT ON TABLE agent_profile IS
  'DB-authoritative agent identity/org/avatar record (ADR-0143 D1). agent_key PK — one profile per '
  'agent. The source of truth; the icm/ persona files + org.yaml human map are a GENERATED reflection '
  '(ADR-0143 D2/D3 — DB wins on drift, content_hash keyed). Avatars served via the public route '
  '/api/public/agent-avatar/[agent_key] (D5, image bytes only). Edited in the admin GUI (agents:operate); '
  'persona sections vectorized into the brain by LocalPipeline (D4, ImperionCRM_LocalPipelineEnrichment#455). '
  'App-native config (archetype H). display_name/role/division are AGENT identity, not a person; '
  'human_counterpart is a UPN (corporate id). No client PII, no secrets.';
COMMENT ON COLUMN agent_profile.reports_to IS
  'agent_key this agent reports to on the org chart (ADR-0135). A slug (roster is file-defined + seeded), not an FK.';
COMMENT ON COLUMN agent_profile.human_counterpart IS
  'UPN of the mapped human counterpart (ADR-0143 — feeds org.yaml human map + the Teams-rail default owner). Corporate id, not client PII.';
COMMENT ON COLUMN agent_profile.avatar IS
  'Agent portrait bytes (ADR-0143 D5). Served via the public avatar route; initials fallback when NULL. An agent image, not a person.';
COMMENT ON COLUMN agent_profile.content_hash IS
  'Content hash of the current profile + persona sections (ADR-0143 D3). The drift detector compares DB ↔ ICM ↔ OKF on this; DB wins.';

CREATE INDEX IF NOT EXISTS idx_agent_profile_division ON agent_profile (division);

-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- 3. agent_persona_section — the six persona-narrative sections (ADR-0143 D1/D4)
-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- One row per (agent_key, section_key). The six keys mirror the ADR-0135 persona sections so a
-- persona .md reconstructs losslessly from rows (ordered by `ordinal`). LocalPipeline vectorizes
-- body_md into the brain (Voyage voyage-3-large @1024d, ADR-0041/0143 D4), re-embedded on hash change.
CREATE TABLE IF NOT EXISTS agent_persona_section (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The agent whose persona this section belongs to (matches agent_profile.agent_key).
  agent_key    text NOT NULL,
  -- Which of the six ADR-0135 persona sections this row carries. CHECK-bounded to the fixed set so
  -- a persona reconstructs deterministically and the drift check can assert completeness.
  section_key  text NOT NULL
                 CHECK (section_key IN (
                   'identity_mandate',
                   'origin_character',
                   'how_you_work',
                   'voice_tone',
                   'behavioral_guardrails',
                   'boundaries'
                 )),
  -- Render/authoring order of the section within the persona (0-based or 1-based; the seed sets it).
  ordinal      smallint NOT NULL DEFAULT 0,
  -- The section prose (Markdown). Agent voice/mandate — no client data, no secrets. Vectorized by LP.
  body_md      text NOT NULL,
  -- UPN of the last admin-GUI editor (audit). Not a secret.
  updated_by   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- One row per section per agent — editing a section is an upsert on this key.
  CONSTRAINT agent_persona_section_uniq UNIQUE (agent_key, section_key)
);
COMMENT ON TABLE agent_persona_section IS
  'The persona narrative, sectioned (ADR-0143 D1). One row per (agent_key, section_key); the six keys '
  '(identity_mandate · origin_character · how_you_work · voice_tone · behavioral_guardrails · boundaries) '
  'mirror the ADR-0135 persona sections so a persona .md reconstructs losslessly (ordered by ordinal). '
  'DB-authoritative; the icm/ persona files are a generated reflection (ADR-0143 D2/D3). Vectorized into '
  'the brain by LocalPipeline (Voyage voyage-3-large @1024d, ADR-0041/0143 D4; ImperionCRM_LocalPipelineEnrichment#455). '
  'App-native config (archetype H). Agent voice/mandate prose only — no client PII, no secrets.';
COMMENT ON COLUMN agent_persona_section.section_key IS
  'One of the six ADR-0135 persona sections: identity_mandate | origin_character | how_you_work | voice_tone | behavioral_guardrails | boundaries.';

-- The profile page + the LP vectorizer read a full persona ordered by (agent_key, ordinal).
CREATE INDEX IF NOT EXISTS idx_agent_persona_section_agent
  ON agent_persona_section (agent_key, ordinal);

-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- 4. procedure_human_owner — the procedure-scoped responsible human + approver set (ADR-0143 D1 / ADR-0142)
-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- The responsible human (owner) + the approver set for a procedure. Feeds the Teams @mentions, the
-- ADR-0142 verdict-side authorization (only a listed approver's verdict counts), and the reject→task
-- assignee. Procedure-scoped exactly like the dial: (agent_key, procedure_key) — the same SOP id is
-- owned by one agent, so the human-owner is keyed to the owning agent's procedure.
--
-- APPROVERS shape: a jsonb array of UPNs, NOT a child table. This matches the house style for a
-- small, bounded config set (0158 agent_action_autonomy.ceilings jsonb; 0163 agent_governance_setting.value
-- jsonb) — an approver list is a handful of UPNs read/written wholesale by the admin GUI and the
-- verdict path, never queried element-wise or joined, so a child table would add a join for no gain.
-- (Justified in the PR body.)
CREATE TABLE IF NOT EXISTS procedure_human_owner (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The agent that owns the procedure (matches agent_procedure_policy.agent_key). Procedures are
  -- agent-scoped, so the human-owner is scoped to the owning agent's procedure.
  agent_key      text NOT NULL,
  -- The procedure this human-owner is for (the agent-scoped procedure slug / SOP id).
  procedure_key  text NOT NULL,
  -- The single responsible human for the procedure — a UPN (feeds the primary Teams @mention +
  -- the reject→internal-task default assignee, ADR-0142). A corporate identifier, not client PII.
  owner          text NOT NULL,
  -- The approver set whose verdict authorizes a parked action — a jsonb array of UPNs (see the
  -- shape rationale above). Defaults to [] (owner-only until approvers are set). Corporate ids, no PII.
  approvers      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Optional human note (e.g. 'Mark is the money-gate approver'). Not PII.
  note           text,
  -- UPN of the last admin-GUI editor (audit). Not a secret.
  updated_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- One human-owner record per (agent, procedure) — editing it is an upsert on this key.
  CONSTRAINT procedure_human_owner_uniq UNIQUE (agent_key, procedure_key),
  -- approvers must be a JSON array (of UPN strings) — cheap structural guard.
  CONSTRAINT procedure_human_owner_approvers_is_array
    CHECK (jsonb_typeof(approvers) = 'array')
);
COMMENT ON TABLE procedure_human_owner IS
  'Procedure-scoped responsible human + approver set (ADR-0143 D1 / ADR-0142). One row per '
  '(agent_key, procedure_key): owner (a UPN — the primary Teams @mention + reject→task default assignee) '
  '+ approvers (a jsonb array of UPNs whose verdict authorizes a parked action, ADR-0142 verdict side). '
  'Relates #1607 (org.yaml human nodes + agent→human map). approvers is jsonb (not a child table) to '
  'match the small-config house style (0158 ceilings / 0163 value jsonb) — read/written wholesale, never '
  'joined. DB-authoritative; the SOP human_owner frontmatter is a generated reflection (ADR-0143 D2/D3). '
  'App-native config (archetype H). owner/approvers are UPNs (corporate ids) — no client PII, no secrets.';
COMMENT ON COLUMN procedure_human_owner.owner IS
  'Single responsible human for the procedure — a UPN (primary Teams @mention + reject→task assignee, ADR-0142). Corporate id, not client PII.';
COMMENT ON COLUMN procedure_human_owner.approvers IS
  'jsonb array of UPNs whose verdict authorizes a parked action (ADR-0142 verdict side). Default [] (owner-only). Read/written wholesale.';

CREATE INDEX IF NOT EXISTS idx_procedure_human_owner_agent
  ON procedure_human_owner (agent_key, procedure_key);

-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- 5. agent_autonomy_score — the derived at-a-glance rollup (ADR-0141 D5)
-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- A pure read view — NOT a control (you cannot set it). Per agent, over its ENABLED procedures:
--   score = round( 100 × Σ(level) / (5 × N_enabled) ),  N_enabled = 0 → 0
-- Disabled procedures contribute nothing (ADR-0141 D2/D5). Agents with zero enabled procedures do
-- not appear as a row; the card/profile surface treats "no row" as 0% (D5). Rendered on the agent
-- cards (#1834) + the profile page (#1835). Trivially consistent with the CREATE OR REPLACE VIEW
-- house style (0019 current_consent, 0036 *_bronze_all).
CREATE OR REPLACE VIEW agent_autonomy_score AS
SELECT
  agent_key,
  count(*)                                        AS enabled_procedures,
  round(100.0 * sum(level) / (5 * count(*)))::int AS score
FROM agent_procedure_policy
WHERE enabled
GROUP BY agent_key;
COMMENT ON VIEW agent_autonomy_score IS
  'Derived agent autonomy score (ADR-0141 D5): round(100 × Σ(level over enabled procedures) / (5 × N_enabled)) '
  'per agent. A READ rollup, NOT a control (you cannot set it — it is a pure function of the per-procedure dials). '
  'Agents with 0 enabled procedures have no row → the card/profile surface renders 0%. Rendered on the agent cards '
  '(#1834) + profile (#1835). No PII, no secrets.';

-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- Grants — least privilege (ADR-0127 write-allowlist pattern; ADR-0143 D6). NO blanket grants.
-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- All four tables are web-facing admin-GUI write targets (the dial, the profile editor, the persona
-- editor, the human-owner editor), so the web role gets SELECT + INSERT/UPDATE/DELETE on exactly
-- these four (explicit, per-table — the 0216 allowlist pattern; the CI guard bans blanket grants).
-- These four tables must also be ADDED to the standing 0216 write-allowlist body so a future
-- least-privilege re-baseline keeps the writes (called out in the PR body / follow-up).
--
-- The backend needs: SELECT on agent_procedure_policy (resolve the dial at dispatch, BE #514) +
-- procedure_human_owner (verdict-side authorization + @mention resolution, ADR-0142); SELECT on
-- agent_profile / agent_persona_section (compose Teams cards, avatar/name, ADR-0142). The backend
-- does not write the profile tables (the admin GUI is the writer); the dial stays web+admin-owned in
-- this ADR (ADR-0141 — operator sets it), so the backend reads it, matching the 0158 dial precedent.
-- Pipeline is untouched (app-native governance, not merged data). Defensive (roles may be absent),
-- mirroring the 0123/0158/0163/0217 grant blocks.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON agent_procedure_policy TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON agent_profile          TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON agent_persona_section  TO "mgid-imperioncrm-web-prd";
    GRANT SELECT, INSERT, UPDATE, DELETE ON procedure_human_owner  TO "mgid-imperioncrm-web-prd";
    -- The derived score view is read-only (a view over the dial); web SELECTs it for the cards/profile.
    GRANT SELECT ON agent_autonomy_score TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    -- Backend READS the dial (dispatch resolution, BE #514) and the human-owner/profile/persona
    -- (Teams card compose + verdict authorization, ADR-0142). No profile writes from the backend.
    GRANT SELECT ON agent_procedure_policy TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON procedure_human_owner  TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON agent_profile          TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON agent_persona_section  TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT ON agent_autonomy_score   TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
