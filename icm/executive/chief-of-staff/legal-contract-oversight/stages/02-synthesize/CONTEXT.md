# Stage 02 — synthesize

**Job:** turn the gather record into a lapse-ranked legal/contract picture with
the obligation/risk flags isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Roll up the signals into the legal/contract picture (expiries and
   renewals coming due, the review queue, obligations in play); collapse
   duplicates per counterparty.
2. `[sonnet]` Rank by time-to-lapse and exposure — the soonest lapse and the
   largest obligation lead.
3. `[sonnet]` Isolate the flags — expiring/lapsing agreements, un-reviewed items
   sitting in the queue, and obligation/risk concerns — each naming the agreement,
   the counterparty, and the exposure or deadline.

## Outputs

`synthesis.md` — a lapse-ranked legal/contract picture (soonest lapse / largest
obligation leading) and a separate flag list, each item naming the agreement, the
counterparty, and the exposure or deadline.

## Audit

- [ ] Picture is lapse-ranked, soonest lapse / largest obligation leading
- [ ] Every flag names an agreement, its counterparty, and the exposure or deadline
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Pool-never-bleed — cross-correlated internally only; nothing client-facing
- [ ] No send/write/actuation occurred — Rachel delegated or parked
