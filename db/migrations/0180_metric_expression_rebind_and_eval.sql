-- 0180: Rebind the executable metric expressions + add the agent↔BI agreement eval case.
-- FE half of backend #265 (test(metrics): agent+BI agree eval case + executable expression
-- rebind). Migration number 0180 claimed at MERGE per system CLAUDE.md §10.3 — authored
-- against the next-free-on-origin/main placeholder; renumber if another migration merges first.
--
-- WHY THIS EXISTS. The metric engine (backend #259/PR#266, `lookupMetric()`) + the
-- `metric_lookup` sub-agent tool (backend #264 + FE grants 0177) are now in place, so an
-- agent and the BI hub resolve a governed number through ONE read path. But the five
-- `metric_definition` expressions seeded by 0159 are DEFINITIONAL FRAGMENTS, not executable
-- SQL — the engine cannot bind them. This migration makes the two definitions that have real
-- backing schema executable, and seeds the eval golden that asserts agent + BI share the one
-- read path by construction.
--
-- WHAT CHANGES.
--   (1) `agent_compute_cost` → executable scalar over `agent_run` (the autonomy-ROI
--       denominator). cost_usd (numeric) + started_at (timestamptz) verified live.
--   (2) `tickets_closed`     → executable scalar over the SILVER `ticket` table, NOT
--       `autotask_ticket` (which does not exist in this DB — verified live). closed_at
--       (timestamptz) verified live. This corrects the 0159 fragment's `autotask_ticket`
--       reference, aligning the definition with the actual silver entity.
--   Both are rebound to `SELECT … AS value` with `:named` temporal params (`:period_start`,
--   `:period`) the engine binds — read-only single-scalar reads, proven executable against
--   the live schema before authoring.
--
--   `mrr`, `gross_margin`, `technician_utilization` are LEFT UNBOUND (kept as their 0159
--   fragments): there is no clean scalar source yet (no `contract.monthly_normalized_value`,
--   no costed margin source, no per-tech available-hours feed). The engine returns
--   status:'unbound' for a fragment it cannot parse — leaving them as-is is the correct,
--   honest state until a backing source lands.
--
--   (3) An `agent_eval_case` golden in the `reporting` module: a metric question whose rubric
--       asserts the agent uses `metric_lookup` and reports the governed value/unit WITHOUT
--       inventing a number. This is the agent↔BI agreement assertion — both sides go through
--       the single governed read path or the case fails. Module `reporting` already has a
--       committed eval-gate baseline (eval/baselines.json: 0.75), so the gate stays green.
--
-- The 2 rebinds only change the `expression` text (how the engine computes the number); the
-- metric's documented MEANING (name/grain/unit/data_class) is unchanged. The OKF concept
-- file `metric_definition.md` timestamp is bumped in this PR (§11) because the documented
-- source-entity for `tickets_closed` moves from `autotask_ticket` to silver `ticket`.
--
-- DORMANT — NOT prod-applied until the orchestrator/Mark runs it (each prod apply is
-- Mark-gated). Additive (UPDATE of seeded definitional text + idempotent eval-case INSERT) +
-- transactional. Frontend-owned schema (ADR-0042). No client row-level data, no PII, no
-- secrets — expressions are formulas over aggregates; the eval input/rubric are synthetic.

BEGIN;

-- ── 1. Rebind the two computable expressions to executable read-only scalars ──────────
-- Idempotent: keyed by the stable `key`; safe to re-run. Only rebinds rows whose expression
-- is still the original 0159 fragment (a later authoring edit is not clobbered).

-- agent_compute_cost: total LLM + embedding spend attributed to agent runs since the period
-- start. cost_usd numeric, started_at timestamptz — both verified live in `agent_run`.
UPDATE metric_definition
SET expression = 'SELECT COALESCE(SUM(cost_usd),0) AS value FROM agent_run WHERE started_at >= :period_start',
    updated_at = now()
WHERE key = 'agent_compute_cost'
  AND expression = 'SUM(cost_usd) FROM agent_run WHERE started_at >= :period_start';

-- tickets_closed: count of SILVER `ticket` rows closed on the given day. silver `ticket` with
-- `closed_at` timestamptz — verified live; `autotask_ticket` does NOT exist in this DB.
UPDATE metric_definition
SET expression = 'SELECT COUNT(*) AS value FROM ticket WHERE closed_at::date = :period',
    updated_at = now()
WHERE key = 'tickets_closed'
  AND expression = 'COUNT(*) FROM autotask_ticket WHERE closed_at::date = :period';

-- mrr / gross_margin / technician_utilization: intentionally LEFT UNBOUND (no rebind) — no
-- clean scalar source yet; the engine returns status:'unbound' for the unparseable fragment.

-- ── 2. Agent↔BI agreement eval golden (the 0155 seed pattern) ─────────────────────────
-- Module-level (`agent_id` NULL → every sub-agent in the `reporting` module). The rubric
-- asserts the governed read path is used and no number is fabricated: `metric_lookup` (the
-- single read path BI also uses) resolves the value, so agent and BI agree by construction.
-- mustNotContain a bare invented digit pattern would false-fail (a legitimate answer may echo
-- the governed value), so correctness rides on mustCite + the LLM-judge `expectation`.
INSERT INTO agent_eval_case (agent_id, module, name, input, rubric, tags, tier) VALUES
  (NULL, 'reporting', 'reports a governed metric via the single read path, never invents it',
   'What was our agent compute cost this period?',
   '{"mustCite": true, "expectation": "Resolves the number through the governed metric read path (the metric_lookup tool / metric_definition contract that the BI hub also reads) and reports the value WITH its unit (usd). Does NOT invent or estimate a figure: if the metric is unbound or has no value it says so rather than fabricating one. This asserts the agent and BI share one read path by construction.", "passThreshold": 0.7}'::jsonb,
   ARRAY['grounding','metrics','headless-bi','reporting'], 'high')
ON CONFLICT (module, name) DO NOTHING;

COMMIT;
