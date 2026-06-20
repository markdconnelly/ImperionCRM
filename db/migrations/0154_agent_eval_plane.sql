-- 0154: Agent eval & quality plane — golden sets, scored runs, per-case results.
-- Eval-plane slice 1 (#984, epic #983, ADR-0106). Migration number 0154 claimed at
-- MERGE per system CLAUDE.md §10.3 — authored against a placeholder; renumber if another
-- migration merges first.
--
-- WHY THIS EXISTS. The agent core (0056) gives us an append-only LEDGER of what the
-- orchestrator did — `agent_run`/`agent_message` record *what happened · why · cost*. They
-- record NOTHING about whether the output was CORRECT. We are ramping the autonomy dial
-- (`autopilot_policies`, 0123; draft→auto) with no regression net: a prompt, model-preset
-- (ADR-0049), or routing change can silently degrade customer-facing output and we would not
-- know. This slice lays the QUALITY plane's spine so later slices can measure it. Mirrors the
-- ledger shape (append-only, backend-writes / web-reads) — this is the scoring twin of
-- `agent_run`, not a replacement.
--
-- THE THREE TABLES.
--   agent_eval_case    — the GOLDEN SET. One curated case per row: which agent/module it
--                        targets, the input, the rubric/expected behavior, tags, tier hint.
--                        Curated canon — synthetic or de-identified inputs ONLY (see PII note).
--   agent_eval_run     — one row per eval BATCH execution: the suite, the git sha + model
--                        preset it ran under, timing, and the aggregate score. The unit a CI
--                        quality gate (slice 4) compares against a baseline.
--   agent_eval_result  — one row per (case × run): a reference to the produced output, the
--                        score, pass/fail, and the judge's rationale (LLM-judge, ADR-0043,
--                        + deterministic assertions — both resolved in the slice-2 runner).
--
-- DORMANT — schema only. NO runner, NO judge calls, NO CI gate in this slice (those are
-- epic #983 slices 2–4). NOT prod-applied until the orchestrator/Mark runs it (each prod
-- apply is Mark-gated). Additive + idempotent + transactional. Frontend-owned schema
-- (ADR-0042). Append-only on runs/results (audit parity with `agent_run` — no DELETE grant).
-- Backend MI (`mgid-imperioncrmbackendfunction`) writes (it is the runtime); web reads for
-- rendering — the exact 0056 split. Pipeline identities get nothing.
--
-- NO SECRETS. NO PII. Golden inputs are curated/synthetic and MUST NOT embed client
-- row-level data (the §8 redaction rule); the rubric describes expected behavior, not real
-- customer records. Agent-platform operational tables — NOT silver business entities (same
-- class as `agent_run`/`agent_memory`), so absent from the OKF bundle (semantic-layer-not-
-- affected).

BEGIN;

-- ── Golden set: the curated "expected behavior" canon ────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_eval_case (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Target. agent_id is optional: a case may target a specific agent OR a whole module
  -- (e.g. every 'sales' sub-agent) by leaving agent_id NULL and keying on module.
  agent_id    uuid REFERENCES agent(id) ON DELETE SET NULL,
  module      text NOT NULL,                       -- 'crm' | 'board' | sub-agent module tag
  name        text NOT NULL,                       -- short human label for the case
  input       text NOT NULL,                       -- the prompt/scenario fed to the agent
  rubric      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- expected behavior: assertions + judge guidance
  tags        text[] NOT NULL DEFAULT '{}',        -- e.g. {grounding,routing,refusal,pii-safety}
  tier        text NOT NULL DEFAULT 'standard',    -- severity/priority hint for gating
  active      boolean NOT NULL DEFAULT true,       -- soft-disable without deleting (append-only spirit)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE agent_eval_case IS
  'Golden-set eval case (#984, ADR-0106). One curated expected-behavior case per row, '
  'targeting an agent (agent_id) or a whole module. Curated/synthetic inputs only — never '
  'client row-level data. Scored by the slice-2 runner into agent_eval_result.';

CREATE INDEX IF NOT EXISTS agent_eval_case_module_idx ON agent_eval_case (module) WHERE active;
CREATE INDEX IF NOT EXISTS agent_eval_case_agent_idx  ON agent_eval_case (agent_id);

DROP TRIGGER IF EXISTS trg_agent_eval_case_updated ON agent_eval_case;
CREATE TRIGGER trg_agent_eval_case_updated BEFORE UPDATE ON agent_eval_case
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Eval run: one row per batch execution of a suite ─────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_eval_run (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite           text NOT NULL,                   -- which suite/selection was run (e.g. 'sales', 'all')
  git_sha         text,                            -- code revision under test (for CI gate diffing)
  model_preset    text,                            -- agent_settings preset in effect (ADR-0049)
  status          text NOT NULL DEFAULT 'running', -- 'running' | 'passed' | 'failed' | 'error'
  case_count      integer NOT NULL DEFAULT 0,
  aggregate_score numeric(5,4),                    -- 0.0000–1.0000; the value the CI gate compares
  triggered_by    text,                            -- 'ci' | 'nightly' | 'manual' | acting context
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz
);
COMMENT ON TABLE agent_eval_run IS
  'Append-only eval-batch ledger (#984, ADR-0106). One row per suite execution; '
  'aggregate_score is what the slice-4 CI quality gate compares against a stored baseline. '
  'Scoring twin of agent_run — no DELETE.';

CREATE INDEX IF NOT EXISTS agent_eval_run_suite_idx ON agent_eval_run (suite, started_at DESC);

-- ── Eval result: one row per (case × run) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_eval_result (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid NOT NULL REFERENCES agent_eval_run(id) ON DELETE CASCADE,
  case_id         uuid NOT NULL REFERENCES agent_eval_case(id) ON DELETE CASCADE,
  agent_run_id    uuid REFERENCES agent_run(id) ON DELETE SET NULL, -- the actual run that produced the output
  score           numeric(5,4),                    -- per-case 0.0000–1.0000
  passed          boolean,                         -- rubric verdict (assertions + judge)
  judge_rationale text,                            -- LLM-judge explanation (ADR-0043) for audit
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE agent_eval_result IS
  'Per-(case × run) eval outcome (#984, ADR-0106). Links a golden case to the agent_run that '
  'produced the output, the score, pass/fail, and the judge rationale. Append-only.';

CREATE INDEX IF NOT EXISTS agent_eval_result_run_idx  ON agent_eval_result (run_id);
CREATE INDEX IF NOT EXISTS agent_eval_result_case_idx ON agent_eval_result (case_id);

-- ── Least-privilege grants (0056 defensive pattern; roles may be absent in some envs) ─
DO $$
BEGIN
  -- Backend MI is the runtime — it writes cases (authoring API), runs, and results.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, UPDATE ON
      agent_eval_case, agent_eval_run, agent_eval_result
    TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;

  -- Web reads for rendering (eval dashboards); never writes.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON
      agent_eval_case, agent_eval_run, agent_eval_result
    TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
END $$;

COMMIT;
