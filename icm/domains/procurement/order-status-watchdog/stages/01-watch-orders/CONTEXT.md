# Stage 01 — watch-orders

**Job:** read each in-flight Pax8 order's state and transition history as of a stated date.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Order state | `bronze pax8_*` (read-only) | in-flight orders: current state, transition timestamps, SKU, quantity | the order clock — Pax8 is the SoR for orders (room.md) |
| Client spine | silver `account` · `okf:account` | owning account per order | whose order — names the human order owner for stage 02 |
| Order-SLA rubric | `./skills/order-sla-rubric.md` | the state ladder + as-of discipline | what a healthy placed→provisioned→billed transition looks like |

## Process

1. `[automation]` Fix the **as-of date** for the sweep (the snapshot date). Time-in-state is
   derived against this date; an undated sweep is an audit fail.
2. `[automation]` Read every in-flight order off the Pax8 bronze mirror — current state,
   the timestamp it entered that state, SKU/quantity, and the owning account — **citing
   each state + its source + as-of** (A5). An order in a state the ladder does not
   recognize, or with a missing state/timestamp, is **parked as a noted gap**, never mapped
   onto the ladder by guess.
3. `[automation]` Derive each order's **time-in-state** (whole hours/days against the as-of
   date) and stage it against the ladder (`order-sla-rubric.md`) for classification in
   stage 02. Read-only throughout — nothing here touches an order.

## Outputs

`orders.md` — the as-of date; every in-flight order (order id, owning account name,
SKU/quantity, current state + entered-at + source, derived time-in-state); and every parked
gap (unrecognized/missing state), noted — not guessed.

## Audit

- [ ] As-of date stated (not blank); every order state cites its source + as-of (A5)
- [ ] Unrecognized or missing states parked as gaps, never guessed onto the ladder
- [ ] Time-in-state labeled derived; states + timestamps labeled measured
- [ ] No actuation / no money commitment emitted (read-only — no retry, re-place, cancel, or nudge)
