---
adr: 0106
title: "Agent eval & quality plane"
status: proposed
date: 2026-06-20
repo: frontend
summary: "An in-platform eval/quality plane as data: golden sets (agent_eval_case), scored eval runs (agent_eval_run) and per-case results (agent_eval_result), scored by deterministic assertions plus an LLM-judge on the existing Claude tier, gated in CI against a baseline. The scoring twin of the agent_run ledger; slice 1 ships schema + ADR dormant."
tags: [meta, agents]
---

# ADR-0106: Agent eval & quality plane

> **Number is a placeholder.** ADR-0106 is claimed at MERGE per system CLAUDE.md §10.3 — the
> branch that merges second renumbers. The migration is authored as `0154_agent_eval_plane.sql`
> against a placeholder likewise.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-20 |
| **Cross-references** | ADR-0049 (model-preset tiers), ADR-0087 (orchestration matrix / one run-ledger), ADR-0091 (single-orchestrator platform), ADR-0104 (grounding cortex), ADR-0105 (access spine), backend ADR-0036 (orchestrator runtime) |

> **Number is a placeholder.** ADR numbers are claimed at MERGE (system CLAUDE.md §10.3). If
> another ADR merges first, renumber this file and its references before squash-merge.

## Problem

The agent platform can record everything it *does* and nothing about whether what it did was
*correct*. `agent_run` / `agent_message` (migration 0056) are an append-only ledger of *what
happened · why · cost*. We are simultaneously raising the autonomy dial — `autopilot_policies`
(0123) moves agents from draft → auto on customer-facing surfaces — with **no regression net**.
A change to a prompt, a model preset (ADR-0049), a routing rule (ADR-0087), or the grounding
registry (ADR-0104) can silently degrade output quality, and the first signal would be a bad
customer-facing send. "Freshness = correctness" (ADR-0104) is asserted as doctrine but never
measured. The gap analysis of 2026-06-20 found this the largest genuinely-absent plane of the
agentic OS: grounding, identity/RLS, autonomy gating, and audit all exist; **quality does not**.

## Context

- One orchestrator, persisted agent core, single choke point for permission + audit (ADR-0091).
- The ledger pattern is settled: append-only, backend-MI writes, web reads (0056).
- The AI stack is settled Claude + Voyage (ADR-0043) — no new provider may be added without an
  ADR. An LLM-judge must therefore reuse the existing Claude tiers.
- We already gate merges on non-code quality signals: docs-gate and okf-sync are CI gates that
  block PRs. A quality gate is the same shape applied to *behavior*.
- Schema is front-end-owned; the executing runtime is backend-owned (§1) — the `agent_run`
  split. The eval plane must follow the same division.

## Options considered

1. **No eval plane — rely on manual spot-checks + the autonomy dial.** Status quo.
2. **External eval SaaS** (Braintrust / LangSmith / Promptfoo-hosted).
3. **In-platform eval plane as data** — golden sets, scored runs, and per-case results as
   first-class Postgres tables; LLM-judge + deterministic assertions in the backend runtime; a
   CI gate comparing aggregate score to a baseline. (Chosen.)

### Tradeoffs

| Option | Pro | Con |
|---|---|---|
| 1 Manual | zero build | does not scale; drift invisible until a customer sees it; blocks raising autonomy safely |
| 2 External SaaS | fast to start, rich UI | ships prompts + (de-identified) business scenarios to a third party — a new data-egress + new-vendor surface against the Entra-only, no-new-provider posture (ADR-0043); another bill; weak fit with our pg/Entra/CI spine |
| 3 In-platform | reuses the ledger pattern, Claude judge (no new provider), our CI, our RLS/audit; golden sets live next to the data they assert on | we build the runner + gate ourselves |

## Decision

Build the eval/quality plane **in-platform, as data**, mirroring the ledger and the medallion
ownership split:

- **Schema (front end).** Three additive tables (migration 0154, this ADR's slice 1):
  `agent_eval_case` (golden set), `agent_eval_run` (one row per batch), `agent_eval_result`
  (one row per case × run). Append-only on runs/results (audit parity with `agent_run`).
- **Runtime (backend, slice 2).** A runner executes a suite against live agents through the
  normal orchestrator path, scores each case with **deterministic assertions** (hard checks:
  refusal happened, citation present, no PII leaked) **plus an LLM-judge** on the existing
  Claude tier (ADR-0043) for rubric-based quality, and writes `agent_eval_run`/`_result`. The
  judge's rationale is persisted for auditability.
- **Gate (front-end CI, slice 4).** A PR-time gate runs the affected suite and **blocks the
  merge if the aggregate score regresses below a stored baseline** — the same mechanism as
  docs-gate / okf-sync. A nightly job runs the full suite.

Slice 1 ships **schema + this ADR only, dormant** — no runner, no judge calls, no gate — exactly
the access-spine slice-1 precedent (#974/0152: plumbing, no policy enabled).

## Consequences

### Security impact

- Golden-set inputs are **curated/synthetic or de-identified** — the §8 rule that client
  row-level PII never lands in artifacts applies to `agent_eval_case.input`/`rubric`. Authoring
  guidance and the slice-3 surface enforce this; no real customer records become test fixtures.
- Eval runs execute through the **same permission-scoped orchestrator path** (ADR-0091/0016) —
  an eval never escalates beyond the scope of the identity it runs under.
- The plane *strengthens* security: a `pii-safety` / `refusal` tag class lets the gate catch a
  regression that would leak data or bypass a guardrail **before** it ships.
- No secrets in schema, ADR, or fixtures (the literal rule: **Never commit secrets**).

### Cost impact

- Each eval run spends Claude tokens (the judge + the runs under test). Bounded by suite size
  and cadence (PR-affected subset on merge; full suite nightly). The judge uses the **cheap
  tier by default** (ADR-0049); `aggregate_score`'s value is catching a bad customer-facing
  send before it happens. No new vendor, no new bill (vs option 2).

### Operational impact

- New dormant migration (Mark-gated prod apply, like every migration).
- Adds a CI gate (slice 4) — fast on the PR-affected subset; the nightly full run absorbs the
  heavier cost off the critical path.
- The eval dashboards read from the same web-read grant as the rest of the agent core.

## Future considerations

- **Feed the learning loop.** Failed eval cases are the natural seed for the
  feedback/reflection plane (the other half of the 2026-06-20 gap analysis): a correction
  captured here becomes `agent_memory` guidance there.
- **Per-agent SLOs.** `aggregate_score` over time per module → quality SLOs surfaced on the
  operations page alongside cost.
- **Event-triggered evals.** Once the agent event/trigger substrate exists, a production run
  flagged low-confidence can enqueue itself as a candidate golden case for review.
