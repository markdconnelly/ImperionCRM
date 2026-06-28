# Stage 02 — synthesize

**Job:** turn the gather record into a leakage-ranked roll-up with the flags
isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Roll up the signals into themes (AR/AP, margin, revenue, pipeline);
   collapse duplicates across accounts.
2. `[sonnet]` Rank by leakage: unprofitable accounts, aging AR, churn-risk revenue,
   pipeline slippage.
3. `[sonnet]` Isolate the flags — unprofitable work and at-risk revenue — each with
   the exposure stated.

## Outputs

`synthesis.md` — leakage-ranked roll-up (highest leakage leading) and a separate
flag list, each item naming the account/area and the exposure.

## Audit

- [ ] Roll-up is leakage-ranked, highest exposure leading
- [ ] Every flag names an account/area and states the exposure
- [ ] No item restates the gather list verbatim (it must be synthesized)
