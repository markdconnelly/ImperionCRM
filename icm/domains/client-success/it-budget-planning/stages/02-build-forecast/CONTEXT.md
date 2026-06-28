# Stage 02 — build-forecast

**Job:** build the IT budget + forward forecast from the roadmap and Audrey's cost handoff.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Budget context | `budget-context.md` (stage 01 output) | full | the roadmap, planned projects, and Audrey's cost figures |
| Budget rubric | `./skills/budget-rubric.md` | all | the budget structure + forecast method + cost discipline |

## Process

1. `[sonnet]` Build the IT budget per `budget-rubric.md`: recurring run-cost, refresh capex,
   project spend, and contingency. Every figure traces to **Audrey's handoff (measured
   signal)** or the roadmap — never invent a cost.
2. `[sonnet]` Build the forward forecast over the planning horizon: extend Audrey's run-cost
   baseline plus the roadmap's planned project + refresh spend. **Label measured signal vs
   your inference** — a growth rate, a contingency %, an inflation factor is *your inference*,
   not a fact (celeste.md guardrail 3). State each assumption so a human can challenge it.
3. `[script]` Assemble the budget + forecast table: each line tagged with its source
   (Audrey handoff / roadmap) and assumptions flagged as inference. Nothing is committed.

## Outputs

`budget-forecast.md` — the structured IT budget (run-cost · refresh capex · project spend ·
contingency) and the forward forecast, each line citing its source and every assumption
labeled measured-signal vs inference.

## Audit

- [ ] Every cost figure traces to Audrey's handoff or the roadmap (no invented numbers)
- [ ] Every forecast assumption is labeled inference, not fact
- [ ] No spend is presented as committed (the budget is a draft, not an authorization)
