# The agent eval & quality plane

How agent output quality is measured, scored, and gated in Imperion Business Manager.

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

On a PR, the affected suite runs and the gate **blocks the merge if `aggregate_score` regresses
below the stored baseline** — the same mechanism as docs-gate / okf-sync. A nightly job runs the
full suite to catch drift outside any single PR.

---

## 5. Build order (epic #983)

| Slice | What | Repo | State |
|---|---|---|---|
| 1 | Eval spine schema + ADR-0106 (this doc), **dormant** | frontend | this PR (#984) |
| 2 | Backend runner: execute suite, assertions + LLM-judge, write runs/results | backend | planned |
| 3 | Golden-set authoring surface + first real seed cases per module | frontend | planned |
| 4 | CI quality gate (PR-affected subset) + nightly full-suite run | frontend CI | planned |

---

## 6. Boundaries

- **No PII, no secrets, no client identifiers** in `agent_eval_case` — curated/synthetic or
  de-identified fixtures only (system [CLAUDE.md §8](../../CLAUDE.md); the literal rule **Never
  commit secrets**). Personal/volatile answers resolve against the live read-only DB, never a
  fixture.
- Agent-platform operational tables — **not** silver business entities (same class as
  `agent_run` / `agent_memory`), so absent from the OKF semantic bundle
  (`semantic-layer-not-affected`).
- The eval plane **measures**; it does not act. Corrections it surfaces feed the
  feedback/learning plane (future), not a write-back from the runner.
