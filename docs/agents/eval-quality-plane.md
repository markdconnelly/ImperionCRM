# The agent eval & quality plane

How agent output quality is measured, scored, and gated in Imperion OS.

[← The AI suite](README.md) · Governing decision:
[ADR-0106](../decision-records/ADR-0106-agent-eval-quality-plane.md) · Epic #983 · Slice 1 #984.

> **Cross-repo note.** This repo is the **GUI** and owns the **schema** (system
> [CLAUDE.md §1](../../CLAUDE.md)). The eval **runner** is the orchestrator runtime in
> **ImperionCRM_Backend** (backend ADR-0036) — the same split as the `agent_run` ledger. The
> front end owns the eval tables, the authoring surface, and the CI gate; the backend executes
> suites and scores them.

---

## 1. Why this plane exists

`agent_run` / `agent_message` (migration 0056) are an **append-only ledger of what the
orchestrator did** — *what · why · cost*. They say nothing about whether the output was
**correct**. Meanwhile the autonomy dial (`autopilot_policies`, 0123,
[autonomy-dial.md](autonomy-dial.md)) moves agents from draft → auto on customer-facing
surfaces. Without a regression net, a change to a prompt, a model preset (ADR-0049), a routing
rule (ADR-0087), or the grounding registry (ADR-0104) can silently degrade quality, and the
first signal is a bad customer-facing send.

The eval plane is the **scoring twin of the run ledger**: it measures behavior so we can raise
autonomy safely and prove "freshness = correctness" (ADR-0104) instead of merely asserting it.

---

## 2. The three tables (migration 0154)

| Table | Purpose |
|---|---|
| `agent_eval_case` | The **golden set**. One curated case per row: the target agent (`agent_id`) or whole `module`, the `input`, a `rubric` (expected behavior: assertions + judge guidance), `tags`, and a `tier`. Curated/synthetic inputs only — **never** client row-level data. `active` soft-disables a case without deleting it. |
| `agent_eval_run` | One row per **batch execution** of a suite: the `suite`, the `git_sha` + `model_preset` it ran under, timing, `case_count`, and the `aggregate_score` the CI gate compares to a baseline. Append-only. |
| `agent_eval_result` | One row per **(case × run)**: a link to the `agent_run` that produced the output, the `score`, `passed`, and the LLM-judge `judge_rationale` (kept for audit). Append-only. |

Backend MI (`mgid-imperioncrmbackendfunction`) writes; web reads for rendering — the exact 0056
grant split. No DELETE (audit parity with `agent_run`).

---

## 3. How a case is scored (slice 2, backend)

Each case runs through the **normal permission-scoped orchestrator path** (ADR-0091/0016 — an
eval never escalates beyond the identity it runs under), then is scored on two axes:

- **Deterministic assertions** — hard, cheap checks the rubric declares: a refusal happened, a
  citation is present, no PII pattern leaked, a required tool was (not) called.
- **LLM-judge** — rubric-based quality on the **existing Claude tier** (ADR-0043, cheap tier by
  default per ADR-0049). No new provider. The judge's rationale is persisted.

A case `passed` only if its assertions hold **and** the judge score clears the rubric threshold.

---

## 4. The quality gate (slice 4, CI)

`scripts/eval-gate.mjs` runs the eval-plane suites against the backend runner and **fails the
build when a suite's `aggregate_score` drops below its committed baseline** (minus a tolerance
band) — the same mechanism as docs-gate / okf-sync. Baselines live in
[`eval/baselines.json`](../../eval/baselines.json) (per-suite minimum + tolerance); a suite with
no committed baseline fails rather than silently passing.

- **CI job:** `eval-gate` in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
- **Dormant by default:** the live HTTP run is guarded on `AGENT_EVAL_BASE_URL`. Until that repo
  var is set (with `EVAL_ACTING_USER_ID`, and `EVAL_RUN_TOKEN` for caller-auth), the gate reports
  `pending_no_backend` and exits 0 — never blocking a PR before a backend is reachable. Same guard
  as the v1 acceptance eval (`scripts/agent-quality-eval.mjs`, ADR-0057); the two are
  complementary — that is the one-time v1 cut gate, this is the ongoing regression net.
- **Run it:** `npm run eval:gate` (pure verdict logic unit-tested in `scripts/eval-gate.test.mjs`).
- Raise a baseline only on a green run at the higher bar; never lower it to make a red gate pass.

---

## 5. Build order (epic #983)

| Slice | What | Repo | State |
|---|---|---|---|
| 1 | Eval spine schema + ADR-0106 (this doc), **dormant** | frontend | shipped (#984) |
| 2 | Backend runner: execute suite, assertions + LLM-judge, write runs/results | backend | shipped (BE #239, ADR-0077) |
| 3 | Golden-set seed + read-only eval dashboard | frontend | shipped (#986) |
| 4 | CI quality gate vs committed baselines (dormant until backend reachable) | frontend CI | shipped (#988) |
| 5 | Eval→improvement feedback loop + PII-safe golden harvest (schema + redaction contract + read surface), **dormant** | frontend | shipped (#1037) |
| 5b | Backend harvester (trace → redacted case) + auto-filer (low score → tuning candidate) | backend | follow-up (authorised by ADR-0120) |

### Golden-set additions

The starter seed (slice 3, migration 0155) is grown by additive seed migrations as new
agent surfaces ship — each follows the 0155 pattern (`ON CONFLICT (module, name) DO NOTHING`).

- **`technician` module** (#1191, migration 0172) — one golden per AI Technician Autotask
  write action shipped in backend #257 (epic #1038): `autotask_update_ticket`,
  `autotask_post_reply`, `autotask_log_time`. Each asserts the action **parks / routes to a
  human** on the autonomous path and executes only via the approval-gated `POST
  /agent/actions/execute` — `post_reply` (`client_pii`) and `log_time` (`financial`) are
  always-gated; `update_ticket` (`operational`) is auto-eligible by class but withheld by the
  v1 technician autonomy ceiling. Per ADR-0083 each `expectation` doubles as the gauntlet goal
  ("the plan meets the ticket-resolution goal **and** routes correctly"). Gated in CI by the
  `technician` baseline in [`eval/baselines.json`](../../eval/baselines.json) (#1195, 0.75 — the
  guardrail-suite bar).

---

## 5b. The per-agent golden standard (#1538, the 26-agent org)

**Goldens are part of the standard per-agent artifact set.** Every new agent built under the
Executive-Suite org (epic #1534, ADR #1535) ships, in the same wave, with a golden suite that
asserts the two behaviours its autonomy ceiling demands. This generalises the `technician`
precedent (0172) from one surface to the whole org and makes the eval plane a real regression net
for it.

**The standard — two goldens per agent, `module` = the agent's domain/role slug:**

1. **Grounding / no-fabrication** (`mustRefuse: false`). A domain scoping question. The agent must
   answer **from its retrieved rooms** (`knowledge.search` / `pg.read` over its `okf_rooms`), cite
   the source, and **when retrieval returns nothing, say so and propose how to obtain it — never
   invent a record, id, or figure.** This is the load-bearing assertion while the retrieval
   substrate is dormant (Voyage seed #389): an agent over empty memory must degrade to an honest
   "no data", not a hallucination.
2. **Park/route** (workers) or **delegate-only** (executives) (`mustRefuse: true`). An actuation
   request. A **worker** has at most an internal `ticket.note` and no autonomous external-actuation
   path (the v1 ceiling), so it **parks** the action and routes it to a human via the approval-gated
   `POST /agent/actions/execute`. An **executive** (Nova + the 5 C-suite) is **delegate-only** (the
   L2 ceiling, enforced structurally by the no-direct-actuation tool budget — ADR #1535 / ADR-0128):
   it never actuates itself — it **delegates** to exactly one sub-agent or routes to its paired human.

**Seeded by migration 0225** (`agent_eval_org_agents_seed`), the 0155/0172 pattern
(`ON CONFLICT (module, name) DO NOTHING`, curated/synthetic fixtures only — fictional clients,
no PII). 36 cases across 18 agents: the 12 new sub-agents (`noc`, `problem-mgmt`, `change-release`,
`dispatch`, `bcdr`, `soc`, `grc`, `identity`, `people`, `legal`, `service-quality`, `knowledge`) +
the 6 executives (`orchestrator`, `chief-of-staff`, `cto`, `deputy-ciso`, `deputy-cfo`, `cro`). Each
suite is baselined at **0.75** (the guardrail bar) in [`eval/baselines.json`](../../eval/baselines.json);
the default gate runs every baselined suite (narrow with `EVAL_SUITES`), and stays dormant until
`AGENT_EVAL_BASE_URL` is set. **Authoring rule going forward:** a new agent's build PR adds its two
goldens + its baseline in the same change set, exactly as it adds its `room.yaml`/persona/workflow.

---

## 5c. The eval→improvement feedback loop (slice 5, #1037, ADR-0120)

Measuring quality is half the job; **closing the loop** is the other half. Slice 5 adds two paths:

**Harvest — real traces → golden cases, PII-redacted.** The richest source of new golden cases is
what agents actually did (`agent_run` / `agent_message`), but that ledger carries client PII and the
golden set is curated/synthetic-only (§8). So every harvested string passes a **fail-closed
redaction contract** — `src/lib/agent/eval-harvest.ts`:

- `redactPii()` replaces every recognised token (email, phone, money, URL, IP, UUID, long number,
  proper name) with a **typed placeholder** — never the original substring; it over-redacts on
  purpose.
- `assertHarvestSafe()` / `residualPii()` re-scan the redacted candidate and **throw** on any
  surviving token. The harvester drops the candidate on throw — a trace that can't be made safe is
  never harvested. **No client row-level PII enters `agent_eval_case`** (proven by the PII fixtures
  in `eval-harvest.test.ts`). This is defence-in-depth on top of the `data_class` RLS floor (0175).
- A harvested case is stamped `agent_eval_case.harvest_source = 'harvested'` + `harvest_run_id`
  (0179) for audit; curated cases keep the `'curated'` default.

**Loop — low scores → Mark-gated tuning candidates.** A failed eval / low-scored run opens an
**`agent_tuning_candidate`** (0179): a `kind` ∈ {prompt, grant, skill} proposal with a PII-free
`title` + `rationale`, an optional `proposed_diff`, provenance, and a `status`
(open → accepted/rejected/applied). **It never auto-applies** — applying a change is a human
decision (the autonomy ceiling, #1036). The accepted/applied track record is the signal earned
autonomy (#1036) later reads. Surfaced on `/agents/evals` as the "Tuning candidates" card.

**Ownership.** The FE owns the schema, the redaction contract/library, and the read surface; the
**backend runtime** owns the harvester (trace → redacted case via `buildHarvestCandidate`) and the
auto-filer (open a candidate, optionally file a GitHub issue → `external_ref`). The backend calls
the FE redaction library as the shared contract. Slice 5 is **dormant** (schema + contract + read
surface); the runtime is the authorised follow-up.

## 6. Boundaries

- **No PII, no secrets, no client identifiers** in `agent_eval_case` — curated/synthetic or
  de-identified fixtures only (system [CLAUDE.md §8](../../CLAUDE.md); the literal rule **Never
  commit secrets**). Personal/volatile answers resolve against the live read-only DB, never a
  fixture.
- Agent-platform operational tables — **not** silver business entities (same class as
  `agent_run` / `agent_memory`), so absent from the OKF semantic bundle
  (`semantic-layer-not-affected`).
- The eval plane **measures**; it does not act. Corrections it surfaces feed the feedback loop as
  **Mark-gated proposals** (`agent_tuning_candidate`, §5c / ADR-0120) — never a write-back from the
  runner and never an auto-applied prompt/grant/skill change.
