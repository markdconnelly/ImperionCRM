-- 0257: Vera conformance engine tables — conformance_rule / process_trace /
-- conformance_deviation (#1532; backend twins BE #438 / ADR-0103 / PR #454 and
-- BE #440 / ADR-0104 / PR #468).
--
-- WHY THIS EXISTS. The backend Vera conformance engine is built + deploy-dormant
-- (ADR-0123) against three FE-owned tables that do not exist yet (§1 / ADR-0042 —
-- the backend cannot own migrations). Every domain's DEFINED WAY of doing work is
-- encoded as machine-checkable RULES (`conformance_rule`); agents emit PROCESS
-- TRACES as they run (`process_trace`); Vera audits each trace against the
-- applicable rules and files one DEVIATION row per violation
-- (`conformance_deviation`) — the input to the #440 closure lifecycle
-- (open → quarantined → routed → verifying → closed). Until this migration is
-- applied the backend fails dormant (42P01 → [] / `persisted:false` / not_found);
-- on apply, `agent/conformance/rules`, `agent/conformance/trace`, and the #440
-- deviation-lifecycle routes light up with no backend redeploy.
--
-- CONSUMER CONTRACT (names/columns are VERBATIM what the backend SQL uses —
-- src/shared/agent/conformance.ts + src/shared/agent/deviation-lifecycle.ts):
--   * Rule read: SELECT ... FROM conformance_rule WHERE active AND domain=$1
--     AND (workflow_key IS NULL OR workflow_key=$2).
--   * Trace ingest: INSERT INTO process_trace (run_id, agent_key, domain,
--     workflow_key, trace_key, steps, facts) ... ON CONFLICT (run_id, trace_key)
--     DO NOTHING RETURNING id — the UNIQUE makes ingest idempotent (a re-ingested
--     trace skips both the trace row and its deviations).
--   * Deviation file: INSERT INTO conformance_deviation (trace_id, rule_id,
--     agent_key, domain, workflow_key, severity, status) with status='open'.
--   * Lifecycle (#440): SELECT by id / by status ORDER BY created_at DESC, and the
--     optimistic UPDATE conformance_deviation SET status=$to WHERE id AND
--     status=$from. STATUS-COLUMN-ONLY: no owner/notes/lifecycle-timestamp columns
--     — the who/where-to/why of a transition lives in audit_log, not here.
--   * `assertion` is a declarative predicate (never code): {kind, value?, key?,
--     other?}; kinds = step_present / step_absent / fact_present / fact_absent /
--     fact_equals / order_before. Unknown kinds are skipped by the auditor
--     (inconclusive, never a false deviation), so no CHECK on assertion kind —
--     forward-compat rules may be authored ahead of the engine.
--
-- Migration number 0257 is the ASSIGNED number for this coordinated schema batch
-- (claimed per system CLAUDE.md §10.3 — renumber at merge if collided).
--
-- ARCHETYPE: governance/process metadata (OKF archetype H — agent-runtime plane,
-- the agent_run/0163 + agent_action_execution/0246 precedent), NOT a curated
-- silver business entity — no OKF concept file (semantic-layer-not-affected).
-- No PII, no secrets: rules + traces carry step names and small structured facts
-- (ids, booleans, enum strings), never message bodies or credentials.
-- process_trace is append-only; conformance_deviation advances status only;
-- NOBODY gets DELETE. Additive, idempotent, transactional. NOT prod-applied
-- until Mark gates the apply.

BEGIN;

-- ── conformance_rule — the defined-way rule store ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conformance_rule (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The domain this rule governs (e.g. service / sales / finance).
  domain       text NOT NULL,
  -- Optional workflow scope; NULL = applies to every workflow in the domain.
  workflow_key text,
  -- Human-readable rule name (e.g. "ticket must be grounded before reply").
  name         text NOT NULL,
  -- Declarative predicate over the trace's steps/facts: {kind, value?, key?, other?}.
  -- Data, never executable code. No kind CHECK — unknown kinds audit as inconclusive.
  assertion    jsonb NOT NULL,
  severity     text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text  -- acting admin (app_user.id or label), the 0054 convention
);

COMMENT ON TABLE conformance_rule IS
  'Vera defined-way conformance rules (#1532; consumers = backend #438/ADR-0103 audit reads, FE admin surface #1459/#1467 authors). One machine-checkable rule per row, scoped by domain + optional workflow_key; `assertion` is a declarative predicate (step_present/step_absent/fact_present/fact_absent/fact_equals/order_before), never code. Backend SELECT-only; web authors. No PII, no secrets (OKF archetype H).';
COMMENT ON COLUMN conformance_rule.workflow_key IS
  'Optional workflow scope; NULL = the rule applies to every workflow in the domain.';
COMMENT ON COLUMN conformance_rule.assertion IS
  'Declarative predicate {kind, value?, key?, other?}; kinds = step_present/step_absent/fact_present/fact_absent/fact_equals/order_before. Unknown kinds are skipped by the auditor (inconclusive) — no CHECK, forward-compat rules allowed.';
COMMENT ON COLUMN conformance_rule.severity IS
  'Deviation severity a violation of this rule files: info | warn | critical.';

-- The audit read path: active rules for a domain, domain-wide (workflow_key NULL) + exact
-- workflow. Partial on active — inactive rules are never read at audit time.
CREATE INDEX IF NOT EXISTS idx_conformance_rule_domain
  ON conformance_rule (domain, workflow_key) WHERE active;

-- updated_at trigger (the 0210/0223/0238/0240 convention)
DROP TRIGGER IF EXISTS trg_conformance_rule_updated ON conformance_rule;
CREATE TRIGGER trg_conformance_rule_updated BEFORE UPDATE ON conformance_rule
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── process_trace — append-only agent process traces ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS process_trace (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The agent_run that produced this trace (ledger provenance, ADR-0080). The run
  -- ledger is itself append-only, so no ON DELETE action (the 0246 precedent).
  run_id       uuid NOT NULL REFERENCES agent_run(id),
  agent_key    text NOT NULL,
  -- The domain + workflow this run executed (selects the applicable rules).
  domain       text NOT NULL,
  workflow_key text,
  -- Idempotency discriminator within a run (e.g. a stage name); default 'final'.
  trace_key    text NOT NULL DEFAULT 'final',
  -- Observed step names in execution order (jsonb array of strings).
  steps        jsonb NOT NULL,
  -- Small structured facts observed during the run (ids, booleans, enum strings — never PII).
  facts        jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- The idempotent-ingest arbiter: the backend INSERTs ON CONFLICT (run_id, trace_key)
  -- DO NOTHING, so a re-emitted trace never double-files its deviations.
  UNIQUE (run_id, trace_key)
);

COMMENT ON TABLE process_trace IS
  'Append-only agent process traces (#1532; writer = backend conformance engine #438/ADR-0103, one POST per run stage). Steps + small structured facts an agent observed while executing a workflow — the audit input Vera evaluates rules against. Idempotent on (run_id, trace_key); rows are never updated or deleted. No PII, no secrets: step names + ids/booleans/enum strings only, never message bodies or credentials.';
COMMENT ON COLUMN process_trace.run_id IS
  'The agent_run whose execution this trace records (ledger provenance, ADR-0080).';
COMMENT ON COLUMN process_trace.trace_key IS
  'Idempotency discriminator within a run (e.g. a stage name); default ''final''. (run_id, trace_key) is UNIQUE — the ON CONFLICT DO NOTHING arbiter.';
COMMENT ON COLUMN process_trace.facts IS
  'Small structured facts observed during the run (ids, booleans, enum strings). Never PII, never message bodies, never credentials.';

-- Provenance lookup ("what traces did this run emit?") — covered by the UNIQUE's
-- (run_id, trace_key) index; no extra index needed.

-- ── conformance_deviation — one row per audited violation (#440 lifecycle subject) ─────────
CREATE TABLE IF NOT EXISTS conformance_deviation (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The trace this deviation was filed against + the rule it violated. Both parents
  -- are append-only stores — no ON DELETE action.
  trace_id     uuid NOT NULL REFERENCES process_trace(id),
  rule_id      uuid NOT NULL REFERENCES conformance_rule(id),
  -- Denormalized from the trace so the #440 queue reads need no join.
  agent_key    text NOT NULL,
  domain       text NOT NULL,
  workflow_key text,
  severity     text NOT NULL,
  -- The #440 closure lifecycle — strictly linear, enforced by the backend's pure
  -- guard (VALID_TRANSITIONS) + optimistic status-conditional UPDATE. STATUS-COLUMN-ONLY:
  -- the who/where-to/why of each transition is recorded in audit_log, not in columns.
  status       text NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'quarantined', 'routed', 'verifying', 'closed')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE conformance_deviation IS
  'One row per audited defined-way violation (#1532; writer = backend conformance engine #438 with status=''open''; lifecycle = backend #440/ADR-0104 open→quarantined→routed→verifying→closed via status-only optimistic UPDATE). The transition who/why lives in audit_log — deliberately no owner/notes columns. Rows are never deleted. No PII, no secrets (OKF archetype H).';
COMMENT ON COLUMN conformance_deviation.status IS
  '#440 closure lifecycle: open → quarantined → routed → verifying → closed (strictly forward/linear; closed is terminal). Backend advances it with an optimistic UPDATE ... WHERE id AND status=$from.';
COMMENT ON COLUMN conformance_deviation.severity IS
  'Copied from the violated rule at filing time (info|warn|critical) so queue triage needs no join.';

-- The #440 queue read: WHERE status = $1 ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_conformance_deviation_status
  ON conformance_deviation (status, created_at DESC);
-- FK lookup paths (trace drill-down / "which rule fires most").
CREATE INDEX IF NOT EXISTS idx_conformance_deviation_trace
  ON conformance_deviation (trace_id);
CREATE INDEX IF NOT EXISTS idx_conformance_deviation_rule
  ON conformance_deviation (rule_id);

-- ── Grants (least-priv, ADR-0127; defensive role checks, the 0158/0246 pattern) ─────────────
-- Backend = auditor + filer: READS rules (never authors them), INSERTs traces +
-- deviations, and advances a deviation's STATUS COLUMN ONLY (#440's optimistic
-- UPDATE touches nothing else). SELECT rides along on the writable tables because
-- INSERT ... RETURNING / ON CONFLICT arbiters / the lifecycle reads need it.
-- Web = the FE admin surface (#1459/#1467): authors rules (INSERT/UPDATE — rules
-- retire via active=false, not DELETE) and READS traces + deviations for the
-- observability surface. Pipelines get NOTHING — this is agent-runtime plane, not
-- an ingestion/merge surface. NOBODY gets DELETE: traces are append-only evidence
-- and deleting a deviation would erase an audit finding.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON conformance_rule TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT ON process_trace TO "mgid-imperioncrmbackendfunction";
    GRANT SELECT, INSERT, UPDATE (status) ON conformance_deviation TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT, INSERT, UPDATE ON conformance_rule TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON process_trace TO "mgid-imperioncrm-web-prd";
    GRANT SELECT ON conformance_deviation TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
END $$;

COMMIT;
