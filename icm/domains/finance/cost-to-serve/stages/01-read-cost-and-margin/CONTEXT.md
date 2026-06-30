# Stage 01 — read-cost-and-margin

**Job:** read the governed `cost_to_serve` / `margin_to_serve` contracts per client / service
line (consumed, not re-derived) into one as-of-dated cost-and-margin record. Read only; no flag,
no escalation, no action.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| As-of scope | the triggering run | the period + as-of date | the subject |
| Governed cost / margin contracts | silver `metric_definition` · `okf:metric_definition` | the `cost_to_serve` / `margin_to_serve` contracts per client / service line | the governed cost + margin (consumed, not re-derived — D1; allocation views 0197/0198/0200 upstream) |
| Revenue grounding | silver `invoice` (QBO read-only mirror) · `okf:invoice` | where a contract resolves through billed revenue | grounding for a contract that resolves through the mirror |
| Cost basis grounding | silver `time_record` · `okf:time_record` | where a contract resolves through attested cost | grounding for the cost basis a contract resolves through |
| Rubric | `./skills/cost-to-serve-rubric.md` | all | which contracts to consume, measured / governed vs derived |

## Process

1. `[script]` Fix the period and the read as-of date; stamp every subsequent figure with that
   as-of date.
2. `[script]` Read the governed `cost_to_serve` / `margin_to_serve` contracts from
   `metric_definition` per client / service line — the **governed result**, not a recomputation
   (D1). Do **not** read the allocation views (0197/0198/0200) directly — read the governed metric
   they feed. Where a contract resolves through billed revenue or cost, ground against the
   `invoice` mirror and the `time_record` cost basis. Write no silver row (read-only).
3. `[script]` Mark each captured figure **measured / governed** (read from the contract) or
   **derived**, and flag any unbound contract or stale source as a **gap** — never fill a gap with
   an estimate. No flag here.

## Outputs

`cost-margin.md` — for the period and its as-of date: the governed cost-to-serve + margin-to-serve
per client / service line (each labelled measured / governed), the grounding sources, and any gaps
called out. No flag or escalation yet — that is stage 02.

## Audit

- [ ] Period and a single read as-of date are stated
- [ ] cost_to_serve / margin_to_serve read from the governed `metric_definition` contracts (not re-derived; allocation views not read directly)
- [ ] Each figure labelled measured / governed or derived; no figure estimated into a gap
- [ ] Any unbound contract or stale source recorded as a gap (never estimated)
- [ ] No silver row written; no metric definition edited; no money action taken (read-only)
