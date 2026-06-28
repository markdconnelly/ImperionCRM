# Stage 02 — flag-margin

**Job:** compute the proposed margin vs the floor vs historical, and flag below-floor /
well-below-historical.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Margin context | `margin-context.md` (stage 01 output) | full | the historical figures + proposed pricing to compute against |
| Margin rubric | `./skills/margin-rubric.md` | all | margin compute, the floor, the flag thresholds + tie-out discipline |

## Process

1. `[sonnet]` Compute the proposed renewal margin from Chase's proposed pricing and the
   cost basis per `margin-rubric.md`; compute the historical margin from the invoice
   revenue. Where the cost-allocation cost side is unbuilt (#1044), a partial-cost margin is
   **labeled derived** — do not estimate the missing cost into a full margin.
2. `[sonnet]` Compare proposed vs the floor and proposed vs historical. Flag a below-floor
   result and a well-below-historical result per the rubric thresholds. For every flag,
   **show the arithmetic** (inputs · expected · actual · delta · as-of) and **label measured
   figure vs derived**. A result at/above floor and near historical is a note, not a flag.
3. `[script]` Assemble the margin flag(s) + the margin intel. Do not estimate into a data
   gap — escalate the gap (most pointedly the unbuilt cost side). Nothing is blocked,
   approved, posted, or pushed.

## Outputs

`margin-flags.md` — the margin intel (historical margin, proposed margin, floor) and the
hard flags (below-floor / well-below-historical), each with its arithmetic + as-of date and
measured-vs-derived labels, plus any escalated data gap.

## Audit

- [ ] Every flag shows its arithmetic + as-of date (measured vs derived labeled)
- [ ] Below-floor / well-below-historical evaluated against the rubric thresholds
- [ ] Cost-allocation gap (#1044) escalated, not estimated into a full margin
- [ ] No block, approval, posting, or QBO push emitted (advise-only)
