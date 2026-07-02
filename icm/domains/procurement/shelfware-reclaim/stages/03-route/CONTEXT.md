# Stage 03 — route

**Job:** raise the internal shelfware finding and split every cancel/downgrade commit out to the governed-procurement money gate.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Reclaim recommendation | `reclaim-rec.md` (stage 02 output) | full | the quantified finding to raise + the commits to split out |
| Shelfware rubric | `./skills/shelfware-rubric.md` | the commit-splits-out rule | where measurement ends and the gated commit begins |

## Process

1. `[automation]` Raise the **internal shelfware finding** (the reclaim recommendation) to
   the budget owner — internal, reversible, auto at L2 (A10 row 1). Urgency is computed,
   not shouted (A6): a candidate whose commitment term renews soon outranks an evergreen
   one.
2. `[automation]` For each recommended cancel/downgrade, **stage the commit as a
   governed-procurement (02-B2) money-gate item** — the exact $, the entitlement citation
   + as-of, and the drafted action, ready for the ONE human approval (approve-once, 0184).
   Nothing is actuated here: B4's assertion-with-spend ≠ measurement (A11); the split-out
   is the whole point of this stage.

## Outputs

`routing.md` — the finding raised (to whom, when), the list of commits staged for the
02-B2 money gate (action + $ + citation per item), and any candidate NOT staged (with the
reason, e.g. a data gap carried from stage 01/02).

## Audit

- [ ] Every staged commit carries its entitlement citation + as-of date and exact $ (A5)
- [ ] Every cancel/downgrade routed to the 02-B2 money gate — none actuated, none skipped silently
- [ ] Finding raised internally only; no external message, no send (room.md)
- [ ] No actuation, no money commitment emitted — the commit waits for a human at 02-B2

## Checkpoint

The reclaim-rec loop: a human (the budget owner) reads the finding; the cancel/downgrade
commitment is decided at the **governed-procurement money gate (02-B2)** — `always_gate`
forever (ADR-0109, migration 0184; BO-03 Procurement §5). **`auto` (L2) may self-approve
raising the internal finding and staging the gate items ONLY** — no cancel, downgrade,
buy, or any money commitment runs in this workflow at any rung (sentinel, not buyer —
room.md).
