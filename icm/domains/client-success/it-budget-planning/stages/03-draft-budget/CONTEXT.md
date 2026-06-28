# Stage 03 — draft-budget

**Job:** draft the IT budget plan as a PARKED recommendation; spend is never committed.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Budget + forecast | `budget-forecast.md` (stage 02 output) | full | the structured budget + forward forecast |
| Budget rubric | `./skills/budget-rubric.md` | all | the no-commits + in-the-client's-interest discipline |

## Process

1. `[sonnet]` Draft the IT budget plan: the plan narrative, the budget table, the forecast,
   and the assumptions (each labeled measured-signal vs inference). Frame it for the client's
   interest, not Imperion's revenue.
2. `[sonnet]` Mark every spend line as a **recommendation to a human** — nothing here
   commits. Flag any **non-interest spend** explicitly: never recommend spend purely to grow
   Imperion's revenue (celeste.md guardrail 4). Spend, pricing, and roadmap commitments route
   to a human at every level (guardrail 1, dial-proof).
3. `[script]` Mark the disposition: the drafted plan **parks** for a human. No commitment is
   executed and no client-facing send is emitted.

## Outputs

`budget-plan.md` — the drafted IT budget plan + forecast as a **parked recommendation**:
the plan, the spend lines (each a recommendation, not a commitment), the labeled
assumptions, and any flagged non-interest spend. Terminal stage; the run ends parked.

## Audit

- [ ] Every spend line is a recommendation, not an executed commitment (NO-COMMITS-EVER)
- [ ] Every assumption labels measured signal vs inference
- [ ] Any non-interest spend is flagged, not buried
- [ ] No client-facing send emitted (this workflow drafts + recommends only)

## Checkpoint

The Teams loop: a human co-shapes and approves the budget plan before anything is acted on.
This workflow is **L1 propose-only — `auto` may self-approve NOTHING**; the drafted plan
parks for a human in every mode, and spend is a recommendation, never an executed commitment
(NO-COMMITS-EVER, dial-proof; celeste.md guardrail 1). A human decides; a human commits.
