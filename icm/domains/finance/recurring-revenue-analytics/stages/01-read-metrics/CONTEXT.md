# Stage 01 — read-metrics

**Job:** read the governed MRR / ARR / NRR + revenue-churn metric contracts (consumed, not
re-derived) into one as-of-dated metric-levels record. Read only; no trend, no flag, no action.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| As-of scope | the triggering run | the period + as-of date | the subject |
| Governed metric contracts | silver `metric_definition` · `okf:metric_definition` | the MRR / ARR / NRR / revenue-churn contracts | the governed metric levels (consumed, not re-derived — D1, #1050) |
| Revenue grounding | silver `invoice` (QBO read-only mirror) · `okf:invoice` | where a contract resolves through the invoice record | grounding for a contract that resolves through the mirror |
| Rubric | `./skills/rr-analytics-rubric.md` | all | which contracts to consume, measured / governed vs derived |

## Process

1. `[script]` Fix the period and the read as-of date; stamp every subsequent figure with that
   as-of date.
2. `[script]` Read the governed MRR / ARR / NRR + revenue-churn contracts from
   `metric_definition` — the **governed result**, not a recomputation (D1). Where a contract
   resolves through the invoice record, ground against the `invoice` mirror. Write no silver row
   (read-only).
3. `[script]` Mark each captured level **measured / governed** (read from the contract) or
   **derived**, and flag any unbound contract or stale source as a **gap** — never fill a gap
   with an estimate. No trend here.

## Outputs

`metrics.md` — for the period and its as-of date: the governed MRR / ARR / NRR + revenue-churn
levels (each labelled measured / governed), the grounding source, and any gaps called out. No
trend or flag yet — that is stage 02.

## Audit

- [ ] Period and a single read as-of date are stated
- [ ] MRR / ARR / NRR + revenue-churn read from the governed `metric_definition` contracts (not re-derived)
- [ ] Each level labelled measured / governed or derived; no figure estimated into a gap
- [ ] Any unbound contract or stale source recorded as a gap (never estimated)
- [ ] No silver row written; no metric definition edited; no money action taken (read-only)
