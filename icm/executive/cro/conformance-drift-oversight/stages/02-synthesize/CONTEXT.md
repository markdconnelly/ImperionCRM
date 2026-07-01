# Stage 02 — synthesize

**Job:** turn the gather record into a drift-risk-ranked roll-up with verified and
suspected findings split and the quarantine candidates isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Classify each signal by drift class — dial change, budget/ceiling
   drift, gate/conformance failure — per agent/workflow; collapse duplicates.
2. `[sonnet]` Split every finding into **verified** (directly read or
   Vera-confirmed) vs **suspected** — a suspected drift is labeled "suspected,
   pending Vera's check" and never asserted (jessica.md §5).
3. `[sonnet]` Rank by drift risk, highest first — severity stated plainly, not
   implied; isolate the quarantine candidates, each with the evidence and the
   blast radius stated.
4. `[sonnet]` Cross-correlate the findings against prior Platform activity
   internally only — pool, never bleed; nothing here is client-facing.

## Outputs

`synthesis.md` — a drift-risk-ranked roll-up (highest risk leading) with each
finding labeled verified or suspected, and a separate quarantine-candidate list,
each item naming the agent/workflow, the evidence by reference, and any prior
Platform activity already in motion.

## Audit

- [ ] Every finding is classified (dial / budget-ceiling / gate) and labeled verified or suspected
- [ ] No suspected finding is asserted as fact — "suspected, pending Vera's check"
- [ ] Roll-up is drift-risk-ranked, severity stated plainly per finding
- [ ] Every quarantine candidate names the agent/workflow and states its evidence by reference
- [ ] Cross-correlation is internal only — no client-facing content produced
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — no config changed, no dial touched, no fix applied
