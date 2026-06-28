# Stage 02 — evaluate-options

**Job:** build the options / weighted-criteria / tradeoff evaluation for the framed need.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Need context | `need-context.md` (stage 01 output) | full | the framed need + the given vendor facts |
| Evaluation rubric | `./skills/evaluation-rubric.md` | all | how to structure options / weighted criteria / tradeoffs / fit |
| Engagement + service | silver `interaction` · `okf:interaction` | recent history for this account | capability-gap + sentiment signals that weight the criteria |
| Existing transactions | silver `opportunity` · `okf:opportunity` | open/recent for this account | what is already in flight that the choice must fit |

## Process

1. `[sonnet]` Lay out the candidate options from the given vendor/solution facts. Take
   pricing/terms as Vance's facts — weigh them, never restate or re-derive them.
2. `[sonnet]` Build the evaluation per `evaluation-rubric.md`: the weighted criteria framed
   to THIS client's need, the per-option tradeoffs (not a single collapsed score), and the
   fit-to-need. For every verdict, **label measured signal vs your inference** — a fit call
   carries the signals that produced it (celeste.md guardrail 3). Never invent a capability,
   a cost, or a fit.
3. `[script]` Assemble the evaluation record: options × criteria × tradeoffs + the fit
   summary. Read only; nothing is committed or sent here.

## Outputs

`evaluation.md` — the options, the weighted criteria (with weights tied to the client's
need), the per-option tradeoffs, and the fit-to-need assessment. Every point labels measured
signal vs inference and cites its source.

## Audit

- [ ] Every fit/criterion verdict labels measured signal vs inference
- [ ] Tradeoffs are explicit per option (not a single collapsed score)
- [ ] Pricing/terms are weighed as Vance's facts, not restated or re-derived
- [ ] Only this client's data was read (no cross-client leakage)
