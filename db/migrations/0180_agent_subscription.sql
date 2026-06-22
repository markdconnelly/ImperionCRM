-- 0180: agent_subscription — predicate fan-out for the wake-event substrate (#999, 1C of
-- epic #991/#997, per ADR-0111 §Scope "deferred to #999").
-- Migration number 0180 claimed at MERGE per system CLAUDE.md §10.3 — 0179 was the highest on
-- origin/main at rebase. RENUMBER AT MERGE if another session lands a lower-numbered migration
-- first: rebase on current main, rename this file + this comment to the next free number, squash.
--
-- WHY THIS EXISTS. 0164 shipped the durable wake-event inbox (agent_event) but DEFERRED the
-- subscription table: the v1 backend dispatcher HARDCODES the single
-- autotask.ticket.created → technician mapping (EVENT_WORKFLOW_MAP). That hardcoded map is a
-- 1:1 type→workflow function — it cannot fan ONE event out to N agents, nor SKIP an event whose
-- payload does not match a rule (e.g. only wake the Technician for SLA-breach severity ≥ high,
-- only wake the vCIO for tier-1 accounts). This migration delivers the data the dispatcher needs
-- to do both: a row per (event_type → workflow) WITH a structured PREDICATE evaluated against the
-- event's subject ∪ payload. One event_type → N rows = fan-out; a non-matching predicate = skip.
--
-- THE PREDICATE CONTRACT (shape mirrored EXACTLY in the backend evaluator —
-- ImperionCRM_Backend src/shared/agent/subscription-predicate.ts; keep the two in sync, this
-- file is the canon). The predicate is a JSON object evaluated against a FLAT FIELD BAG = the
-- event's subject merged under its payload (payload wins on key collision). It is DATA, never
-- code — the evaluator is a pure interpreter, no eval/expression compilation. Two forms:
--
--   1. A LEAF condition:   { "field": "<dotpath>", "op": "<operator>", "value": <json> }
--        field — dot path into the field bag, e.g. "severity", "account.tier", "queueId".
--        op    — one of:  eq | ne | in | nin | gt | gte | lt | lte | exists | contains
--                 eq/ne     — strict equality / inequality (string|number|bool).
--                 in/nin    — membership / non-membership; value is a JSON array.
--                 gt/gte/lt/lte — numeric comparison; non-numeric operand ⇒ NO MATCH (deny-safe).
--                 exists    — field is present & non-null; value is a bool (true ⇒ must exist,
--                             false ⇒ must be absent).
--                 contains  — value is a substring of the (string) field, OR a member of the
--                             (array) field.
--   2. A COMPOUND node:    { "all": [ <node>, … ] }  — AND (every child matches)
--                          { "any": [ <node>, … ] }  — OR  (≥1 child matches)
--                          { "not": <node> }          — negation
--      Compound nodes nest arbitrarily. An EMPTY/absent predicate ({} or NULL) = MATCH-ALL
--      (the subscription fires for every event of its type — the parity-with-0164 default).
--
--   DENY-SAFE BY CONTRACT. A predicate that is MALFORMED (unknown op, wrong-shaped node, bad
--   value type, non-numeric operand to gt/lt, …) evaluates to NO MATCH — never a crash, never a
--   match-by-default. The dispatcher logs the malformed subscription and moves on; one bad rule
--   never wakes an agent it should not, and never sinks the dispatch pass.
--
-- Archetype H (governance/control), horizontal Audit/governance domain — a twin of
-- agent_event / agent_run / agent_governance_setting (0163/0164). App-native control plane; NOT
-- silver, NOT pipeline-merged → no OKF concept file in the silver sense (semantic-layer-not-
-- affected, the 0154/0158/0163/0164 precedent). The predicate CONTRACT is nonetheless documented
-- as canon in docs/agents/event-subscription-predicate.md + a coverage-matrix `n/a` row so the
-- backend mirror has one home to track (system CLAUDE.md §11). Frontend-owned schema (ADR-0042).
-- Predicate values are operator-authored routing literals (severities/tiers/queue ids) — no
-- client_pii, no secrets. Additive, idempotent, transactional. NOT prod-applied until Mark runs
-- it (each prod apply is Mark-gated, §10.3).

BEGIN;

-- ── agent_subscription: event_type + predicate → workflow (the fan-out routing table) ───────
-- One row per "wake workflow W for events of type T whose payload satisfies predicate P". The
-- backend dispatcher, per claimed agent_event, loads the ENABLED rows for event_type, evaluates
-- each predicate against subject ∪ payload, and opens one agent_run per match (fan-out). Zero
-- matches ⇒ the event is `ignored` (no subscription / no rule matched).
CREATE TABLE IF NOT EXISTS agent_subscription (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Dotted event type this rule subscribes to, e.g. 'autotask.ticket.created'. Joins to
  -- agent_event.event_type (not an FK — agent_event has no type dimension table; the string is
  -- the contract).
  event_type      text NOT NULL,
  -- The ICM workflow slug to wake on a match, e.g. 'technician'. The dispatcher passes this to
  -- the ADR-0073 createIcmRun() producer as workflowSlug. (No FK — workflows are a backend code
  -- identity, system CLAUDE.md §1.)
  workflow_key    text NOT NULL,
  -- Structured predicate evaluated against the event's subject ∪ payload (see the contract in the
  -- header). {} = match-all. NULL is normalized to match-all by the evaluator (deny-safe default
  -- here is MATCH-ALL only because an explicitly empty rule means "every event of this type" —
  -- a MALFORMED non-empty predicate is NO-MATCH, enforced in the evaluator, not the schema).
  predicate       jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Operator toggle: disabled rows are skipped by the dispatcher without deletion (audit-friendly,
  -- mirrors the agent_governance_setting on/off pattern, 0163).
  enabled         boolean NOT NULL DEFAULT true,
  -- Optional human label for the operator surface (#1000 observability), e.g.
  -- 'Technician — high-severity tickets'. Cosmetic; never routing.
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- A given (event_type, workflow_key) appears at most once today (one rule per pair). If two
  -- distinct predicates for the same pair are ever needed, drop this and key on a name instead.
  UNIQUE (event_type, workflow_key)
);
COMMENT ON TABLE agent_subscription IS
  'Predicate fan-out routing for the wake-event substrate (#999, 1C of epic #991/#997, ADR-0111). One row per (event_type → workflow_key) WITH a structured predicate (jsonb) evaluated by the backend dispatcher against an agent_event''s subject ∪ payload: matches → one agent_run per matched row (fan-out); no match → the event is ignored. Supersedes the v1 hardcoded EVENT_WORKFLOW_MAP. Web RW (admin config), backend SELECT (the dispatcher). Predicate values are operator routing literals (severity/tier/queue ids) — no client_pii, no secrets.';
COMMENT ON COLUMN agent_subscription.predicate IS
  'Structured predicate (DATA, not code) evaluated against subject ∪ payload. Leaf {field,op,value} (op: eq|ne|in|nin|gt|gte|lt|lte|exists|contains) or compound {all|any:[…]} / {not:…}; {} or NULL = match-all. Malformed non-empty predicate ⇒ NO MATCH (deny-safe, enforced in the backend evaluator). Mirror: ImperionCRM_Backend src/shared/agent/subscription-predicate.ts.';
COMMENT ON COLUMN agent_subscription.workflow_key IS
  'ICM workflow slug woken on a predicate match (passed to ADR-0073 createIcmRun as workflowSlug). No FK — workflows are a backend code identity (system CLAUDE.md §1).';

-- The dispatcher's hot path: "all enabled rules for this event_type". Partial index on enabled
-- keeps it tight as disabled rules accumulate.
CREATE INDEX IF NOT EXISTS idx_agent_subscription_event_type_enabled
  ON agent_subscription (event_type) WHERE enabled;

-- ── Seed the v1 wedge rule so behaviour is UNCHANGED at cutover ──────────────────────────────
-- 0164's hardcoded EVENT_WORKFLOW_MAP = { 'autotask.ticket.created': 'technician' } becomes one
-- match-all subscription row. The backend dispatcher, once it reads this table, reproduces the
-- exact v1 behaviour (every autotask.ticket.created wakes the technician) — then operators add
-- predicated rules (severity/tier/owner) without a redeploy. Idempotent (UNIQUE pair).
INSERT INTO agent_subscription (event_type, workflow_key, predicate, description)
VALUES (
  'autotask.ticket.created', 'technician', '{}'::jsonb,
  'v1 wedge: every new Autotask ticket wakes the Technician (match-all; parity with the 0164 hardcoded map).'
)
ON CONFLICT (event_type, workflow_key) DO NOTHING;

-- ── Grants: web reads+writes (admin config surface), backend reads (the dispatcher). Mirrors
--    the 0163/0164 control-plane split. Defensive: skip a role that is absent (non-prod / fresh DB).
DO $$
BEGIN
  -- Web app owns the admin config surface for subscriptions (create/toggle/edit rules).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON agent_subscription TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  -- Backend dispatcher reads the enabled rules per event to fan out.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON agent_subscription TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
END $$;

COMMIT;
