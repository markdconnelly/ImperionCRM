# Workflow: it-budget-planning (client-success)

**Job:** Celeste's **vCIO IT budget plan + forecast** — draft an IT budget plan and a
forward forecast for a client from the account's strategic roadmap, with cost figures
arriving as an **Audrey (Finance) read-only handoff** (Celeste reads no financials
directly). The plan is a **parked recommendation** for a human; spend is never committed.

> **💤 DORMANT (ADR-0123, built-but-inert).** This playbook is authored
> capability-complete but **inert until its substrate lands**: the **vCIO assembly
> #1043** (the QBR/SBR-led planning surface) and the **profitability / spend substrate
> #1044** (the cost-to-serve figures Audrey hands over). Until both ship, runs have no
> input to plan against. This is the agent-first build doctrine (celeste.md grounding).

**Trigger:** a planning request for a client — a budget-cycle cadence, a QBR follow-up,
or a vCIO ask — naming the client. One run per client budget plan.

**What this is NOT:** no commitment, no client-facing send, no spend authorization. The
run drafts an IT budget plan + forecast and **parks it as a recommendation**; a human
decides and a human commits. **NO-COMMITS-EVER** is dial-proof (celeste.md guardrail 1):
spend routes as a recommendation at **every** rung, no exceptions. Celeste advises **in
the client's interest, not Imperion's revenue** (guardrail 4).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | budget-context | Frame the account + its strategic plan; receive Audrey's cost handoff | — |
| 02 | build-forecast | Build the budget + forward forecast from the roadmap + Audrey's cost handoff | — |
| 03 | draft-budget | Draft the budget plan as a PARKED recommendation; spend never committed | **Teams-loop** |

## Autonomy

Rung **L1 = propose-only** (a Teams-loop gradient — a human co-shapes the draft and
approves). The drafted budget **parks** in every mode; spend is a recommendation to a
human, never an executed commitment. The **NO-COMMITS-EVER** ceiling is dial-proof
(celeste.md guardrail 1) — no rung crosses it. Celeste reads **no financials directly**:
all cost/spend figures arrive as an **Audrey read-only handoff** (the same pattern
renewal-readiness uses for Audrey's margin). Strict client-confidential boundary: one
client's plan or figures never enter another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `budget-rubric.md` (the IT budget plan structure,
forecast method, the Audrey-handoff cost discipline, and the no-commits framing).
Mark-editable; stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
