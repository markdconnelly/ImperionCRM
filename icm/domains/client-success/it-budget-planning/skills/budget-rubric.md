# IT budget plan & forecast rubric (Mark-editable — the vCIO budget structure)

> DEFAULTS authored by the agent 2026-06-27. The rubric for `it-budget-planning`: how to
> structure an IT budget plan, how to forecast, how to handle Audrey's cost handoff, and
> the no-commits discipline. Mark: edit freely; stages cite this, nothing restates it.

## The cost discipline: Celeste reads no financials directly

- **Cost arrives as an Audrey (Finance) read-only handoff.** Run-cost, cost-to-serve,
  per-service spend — every financial figure comes from Audrey, not from a financial
  source Celeste reads. Treat the handoff as a plain measured input (this mirrors how
  renewal-readiness consumes Audrey's margin).
- **No figure is invented.** If Audrey's handoff is missing a line the plan needs, state
  the gap and park — never fabricate a cost. A budget number without its Audrey source is
  not a budget; it is a guess.

## The IT budget plan structure

| Section | What it holds | Source |
|---|---|---|
| Recurring run-cost | the standing managed-services + licensing run-rate | Audrey handoff (measured) |
| Refresh capex | hardware/lifecycle refresh due in the horizon (EOL, warranty) | roadmap + Audrey handoff |
| Project spend | planned projects from the roadmap (the strategic plan funds these) | strategic review + opportunity |
| Contingency | a reserve for unplanned spend (a % of the above, stated as an assumption) | inference (label it) |

## Forecast method

- **Forecast forward from the roadmap, not from a guess.** The strategic plan sets what
  the client intends to do; Audrey's run-cost sets the baseline; the forecast extends the
  baseline plus the roadmap's planned project + refresh spend over the horizon.
- **Every assumption is labeled inference.** A growth rate, a contingency %, an inflation
  factor — these are *your inference*, not measured fact. Label them so a human can
  challenge each one (celeste.md guardrail 3). A measured figure (Audrey's run-cost) is
  signal; a projection built on it is inference.

## The no-commits discipline

- **Propose, never commit — spend is a recommendation to a human.** The budget plan and
  every spend line park as recommendations at every level. Roadmap, pricing, and spend
  commitments route to a human, always (celeste.md guardrail 1, dial-proof). This
  workflow has no commit path and creates none.
- **In the client's interest, not Imperion's revenue.** Flag any **non-interest spend**
  explicitly — never recommend spend purely to grow Imperion's revenue (guardrail 4). A
  budget that pads Imperion's invoice is not advice.
- **Nothing leaves.** No client-facing send; the plan is handed to a human, who decides
  and (if approved) commits. Sends, if any later, exit only through ADR-0058.
