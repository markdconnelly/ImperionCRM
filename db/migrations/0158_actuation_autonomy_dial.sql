-- 0158: Actuation autonomy dial (1–5) + approval-cockpit queue (#1012 / 2E, ADR-0109 / ADR-0107 D4/D5).
--
-- Implements the schema for the native 1–5 autonomy dial and the approval cockpit:
--
--   agent_action_autonomy — the ACTUATION dial. One 1–5 level per (agent_key, action_class)
--                           → resolves to an ADR-0055 tier ceiling. Distinct from the ICM
--                           L0–L3 rung dial (agent_autopilot_policy, 0123): one dial CONCEPT,
--                           two planes (ADR-0109). FAIL-CLOSED default level 1 (Manual) ⇒
--                           today's behavior (every T1+ action approved) until raised.
--   agent_pending_action  — the cockpit queue. The backend enqueues an action routed ABOVE
--                           the resolved ceiling (D5); the cockpit lists it; approve/reject
--                           runs the existing executor (consent re-checked). Routing/level/
--                           ceiling are recorded here (the CRM orchestrator isn't on agent_run
--                           yet — ADR-0109 Context).
--
-- Archetype H (governance/control), horizontal Audit/governance domain — twins of
-- agent_autopilot_policy / agent_tool_grant / agent_settings. App-native; NOT silver, NOT
-- pipeline-merged. Frontend-owned schema (ADR-0042). No PII, no secrets (config keys + the
-- same drafted action payload the proposedAction path already carries). Additive, idempotent,
-- transactional. NOT prod-applied until merge (system CLAUDE.md §10.3).

BEGIN;

-- ── agent_action_autonomy: the 1–5 actuation dial (ADR-0107 D4 / ADR-0109) ────────────────
CREATE TABLE IF NOT EXISTS agent_action_autonomy (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Acting sub-agent's stable key (e.g. 'sales', 'crm') or '*' = the global default.
  agent_key     text NOT NULL,
  -- Action class this level scopes to: '*' = the agent default, or a kind (e.g. 'send_email')
  -- for the per-action-class override D4 allows. Exact action_class beats '*' on read.
  action_class  text NOT NULL DEFAULT '*',
  -- The autonomy level 1–5. FAIL-CLOSED default 1 (Manual): only T0 reads run unattended,
  -- every T1+ action routes to the cockpit. 1 & 5 fixed by definition; 2–4 tunable via ceilings.
  level         smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  -- Optional override of the level→tier-ceiling boundaries (ADR-0107 defaults otherwise).
  -- Shape: { "2": "T1", "3": "T2", "4": "T3" }. Empty = use the built-in defaults.
  ceilings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_action_autonomy_uniq UNIQUE (agent_key, action_class)
);
COMMENT ON TABLE agent_action_autonomy IS
  'The 1–5 ACTUATION autonomy dial (ADR-0107 D4 / ADR-0109). One level per (agent_key, action_class) resolving to an ADR-0055 tier ceiling; an action above the ceiling routes to the approval cockpit (agent_pending_action). Fail-closed default level 1 (Manual). Distinct from the ICM L0–L3 rung (agent_autopilot_policy, 0123) — one dial concept, two planes. Caps: agents:operate (admin). No PII, no secrets.';

CREATE INDEX IF NOT EXISTS idx_agent_action_autonomy_lookup
  ON agent_action_autonomy (agent_key, action_class);

-- ── agent_pending_action: the approval-cockpit queue (ADR-0107 D5 / ADR-0109) ─────────────
CREATE TABLE IF NOT EXISTS agent_pending_action (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Proposing acting agent (sub-agent key) + the action contract (catalog kind, 2C) + tier.
  agent_key         text NOT NULL,
  action_kind       text NOT NULL,
  tier              text NOT NULL,                       -- ADR-0055 tier of the action (T0–T3)
  -- Everything needed to execute on approval: the validated action + delivery params
  -- (to / fromConnectionId). Same sensitivity as the existing proposedAction (drafted body +
  -- target) — never a credential.
  payload           jsonb NOT NULL,
  rationale         text,
  target_contact_id uuid,
  -- The dial decision that routed this action here.
  resolved_level    smallint,
  resolved_ceiling  text,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired')),
  -- Decision provenance (the approver becomes the audited actor at execute — ADR-0032).
  decided_by_user_id uuid REFERENCES app_user(id),
  decided_at        timestamptz,
  interaction_id    uuid,                                -- set after a successful execute
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE agent_pending_action IS
  'Approval-cockpit queue (ADR-0107 D5 / ADR-0109): actions routed ABOVE the resolved autonomy ceiling, awaiting a human approve/reject. The backend enqueues on route and executes (consent re-checked) on approval via the agent/actions/execute catalog; the cockpit (FE) lists pending items. Append-mostly; status transitions pending→approved/rejected→executed. No secrets; payload is the same drafted action the proposedAction path carries.';

CREATE INDEX IF NOT EXISTS idx_agent_pending_action_status
  ON agent_pending_action (status, created_at DESC);

-- ── Grants: web RW the dial (operator slider, agents:operate) + READ the queue (cockpit
--    render, ADR-0042); backend READ the dial (resolve at dispatch) + RW the queue (enqueue +
--    decide/execute). Pipeline untouched. Defensive (roles may be absent), per 0123's pattern.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON agent_action_autonomy TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON agent_pending_action TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON agent_action_autonomy TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE ON agent_pending_action TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
