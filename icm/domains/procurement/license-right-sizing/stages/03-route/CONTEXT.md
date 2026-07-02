# Stage 03 — route

**Job:** surface the right-sizing recommendation and split every commit out to the governed-procurement money gate.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Right-sizing recommendation | `right-sizing-rec.md` (stage 02 output) | full | the quantified recommendation to surface + the commits to split out |
| Right-sizing rubric | `./skills/right-sizing-rubric.md` | the tradeoff shape | where the recommendation ends and the gated commit begins |

## Process

1. `[automation]` Surface the **internal right-sizing recommendation** to the budget owner
   — internal, reversible, auto at L2 (A10 row 1). Urgency is computed (A6): a finding
   whose commitment term renews soon (re-buy imminent) outranks an evergreen one.
2. `[automation]` For each recommended consolidate/downgrade, **stage the commit as a
   governed-procurement (02-B2) money-gate item** — the exact current-vs-target $, the
   utilization citation + as-of, and the drafted action, ready for the ONE human approval
   (approve-once, 0184). Nothing is actuated here: B4's assertion-with-spend ≠ measurement
   (A11). Parked gaps (missing utilization, #1311-gated) are surfaced as gaps, not staged.

## Outputs

`routing.md` — the recommendation surfaced (to whom, when), the commits staged for the
02-B2 money gate (action + $ + citation per item), and every finding NOT staged with its
reason (parked gap / #1311-gated / dropped-for-catalog-baseline).

## Audit

- [ ] Every staged commit carries its utilization citation + as-of date and exact $ (A5)
- [ ] Every consolidate/downgrade routed to the 02-B2 money gate — none actuated, none skipped silently
- [ ] Parked gaps surfaced as gaps — nothing staged off missing utilization data
- [ ] No actuation, no money commitment emitted — the commit waits for a human at 02-B2

## Checkpoint

The right-sizing loop: a human (the budget owner) reads the recommendation; the
consolidate/downgrade commitment is decided at the **governed-procurement money gate
(02-B2)** — `always_gate` forever (ADR-0109, migration 0184; BO-03 Procurement §5).
**`auto` (L2) may self-approve surfacing the internal recommendation and staging the gate
items ONLY** — no consolidate, downgrade, or cancel runs in this workflow at any rung
(sentinel, not buyer — room.md).
