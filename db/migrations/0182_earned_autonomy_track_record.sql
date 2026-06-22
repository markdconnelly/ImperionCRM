-- 0182: Earned / graduated autonomy track record + transition ledger (#1036, ADR-0121).
-- Migration number 0182 is a PLACEHOLDER — RENUMBER AT MERGE per system CLAUDE.md §10.3
-- (rebase on current main, take the next free number, rename + fix references, then squash;
-- 0179 is the highest on main at authoring time — multiple sessions are live).
--
-- WHY THIS EXISTS. The 1–5 actuation dial (agent_action_autonomy, 0158, ADR-0109) is the
-- operator-set FLOOR. Issue #1036 makes autonomy EARNED on top of it: an agent that builds a
-- clean eval + approval track record on an action class auto-promotes its effective tier
-- ceiling one ADR-0055 tier at a time, fully audited, and INSTANTLY demotes to the dial floor
-- on a single "miss". The always-surface classes (money / credentials / customer-facing —
-- data_class.always_gate, #1034 / ADR-0118) are a HARD CEILING: no earned record can auto-cross
-- them. This table is the durable track-record state + the promotion/demotion ledger the
-- dispatcher reads at resolve time and the cockpit (#1014) renders.
--
--   agent_earned_autonomy  — current earned state per (agent_key, action_class): the earned
--                            tier, the clean streak, the per-row promote threshold + eval floor.
--                            Twin of agent_action_autonomy (0158); one row per pair.
--   agent_earned_transition — append-only ledger of every promote/demote, for the cockpit's
--                            "last promotion/demotion" line and the glass-box audit (#1036
--                            acceptance: every promotion/demotion ledgered + surfaced).
--
-- The earned dimension only ever RAISES the operator dial ceiling for a NON-always-gate class;
-- for an always-gate class the earned raise is discarded at dispatch (the invariant lives in
-- code: src/lib/agent/earned-autonomy.ts clampCeilingForClass + action-dispatch.ts; the DB
-- stores the *capability*, the dispatcher applies the hard ceiling per action's data_class).
--
-- Archetype H (governance/control), horizontal Audit/governance domain — twin of
-- agent_action_autonomy / agent_pending_action (0158) + agent_run routing columns (0176).
-- App-native; NOT silver, NOT pipeline-merged → no OKF concept file
-- (semantic-layer-not-affected, the 0158/0163/0176 precedent). Frontend-owned schema
-- (ADR-0042). No PII, no secrets (agent keys + action-class names + tier labels + counters).
-- Additive, idempotent, transactional. NOT prod-applied until merge — each prod apply is
-- Mark-gated (§10.3).

BEGIN;

-- ── agent_earned_autonomy: current earned track record per (agent, action_class) ───────────
CREATE TABLE IF NOT EXISTS agent_earned_autonomy (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Acting sub-agent's stable key (e.g. 'sales', 'crm'). NOT '*' — autonomy is earned per
  -- concrete agent, never as a global default (a global earned tier would be a back door
  -- around the per-agent track record). The dispatcher only applies an earned row when it
  -- keys this exact (agent, class).
  agent_key        text NOT NULL,
  -- The action class the record is built on (a catalog kind, e.g. 'update_ticket'). NOT '*':
  -- a track record is specific to an action class (ADR-0121 D1).
  action_class     text NOT NULL,
  -- The ADR-0055 tier the agent has EARNED on this class (T0–T3), raising the effective dispatch
  -- ceiling for NON-always-gate classes. NULL = nothing earned yet (the operator dial alone
  -- governs). Never below the dial; only ever raises.
  earned_tier      text CHECK (earned_tier IS NULL OR earned_tier IN ('T0','T1','T2','T3')),
  -- Consecutive clean approvals since the last promotion / demotion (drives the next step-up).
  clean_streak     integer NOT NULL DEFAULT 0 CHECK (clean_streak >= 0),
  -- N clean approvals required to step up one tier (≥1). Mirrors DEFAULT_PROMOTE_THRESHOLD.
  promote_threshold integer NOT NULL DEFAULT 5 CHECK (promote_threshold >= 1),
  -- Minimum eval score [0,1] a run must clear to count as a clean approval toward the streak.
  clean_eval_floor numeric(4,3) NOT NULL DEFAULT 0.750
                     CHECK (clean_eval_floor >= 0 AND clean_eval_floor <= 1),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_earned_autonomy_uniq UNIQUE (agent_key, action_class)
);
COMMENT ON TABLE agent_earned_autonomy IS
  'Earned / graduated autonomy track record (#1036, ADR-0121). Per (agent_key, action_class): the ADR-0055 tier the agent has earned (raising the dispatch ceiling for NON-always-gate classes only — the always_gate hard ceiling, #1034/ADR-0118, is enforced at dispatch and discards the earned raise), the clean approval streak, and the promote threshold + eval floor. Twin of agent_action_autonomy (0158). Promotes on a clean streak; INSTANT demote to the dial floor on a miss. No PII, no secrets.';

CREATE INDEX IF NOT EXISTS idx_agent_earned_autonomy_lookup
  ON agent_earned_autonomy (agent_key, action_class);

-- ── agent_earned_transition: append-only promote/demote ledger (cockpit + audit) ───────────
CREATE TABLE IF NOT EXISTS agent_earned_transition (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key     text NOT NULL,
  action_class  text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('promote','demote')),
  -- Tier before / after the transition (NULL = dial-only / no earned tier).
  from_tier     text CHECK (from_tier IS NULL OR from_tier IN ('T0','T1','T2','T3')),
  to_tier       text CHECK (to_tier   IS NULL OR to_tier   IN ('T0','T1','T2','T3')),
  -- Why: clean-streak met (promote) or the precise miss (demote). No PII (action-class + counters).
  reason        text NOT NULL,
  -- The run that triggered the transition, for the glass-box drill-down (agent_run, 0163/0176).
  agent_run_id  uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE agent_earned_transition IS
  'Append-only ledger of every earned-autonomy promotion / demotion (#1036 acceptance: every promote/demote ledgered + surfaced in the cockpit #1014). One row per transition with from/to tier, reason, and the triggering agent_run. No PII, no secrets.';

CREATE INDEX IF NOT EXISTS idx_agent_earned_transition_recent
  ON agent_earned_transition (agent_key, action_class, created_at DESC);

-- ── Grants. The BACKEND dispatcher (BE #250) is the authoritative writer: it applies run
--    outcomes (promote/demote) and writes both tables at dispatch. The web role READS both for
--    the cockpit's earned-tier / track-record / last-transition display (ADR-0042 — the FE
--    renders, it does not run the promotion engine). Defensive (roles may be absent), per the
--    0158 / 0176 pattern.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON agent_earned_autonomy  TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON agent_earned_transition TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON agent_earned_autonomy  TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT          ON agent_earned_transition TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
