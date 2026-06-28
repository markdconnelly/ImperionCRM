# Stage 02 — synthesize

**Job:** turn the gather record into a risk-ranked roll-up with the dangerous items
isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Roll up the signals into themes (backlog, SLA, incidents, problems,
   change, capacity); collapse duplicates.
2. `[sonnet]` Rank by risk: about to breach, recurring, dangerous change this week,
   capacity shortfall.
3. `[sonnet]` Isolate the items that need a human's eyes, each with the risk stated
   plainly.

## Outputs

`synthesis.md` — risk-ranked roll-up (highest-risk leading) and a separate risk
list, each item naming the sub-agent/area and the exposure.

## Audit

- [ ] Roll-up is risk-ranked, highest exposure leading
- [ ] Every risk-list item names an area and states the exposure
- [ ] No item restates the gather list verbatim (it must be synthesized)
