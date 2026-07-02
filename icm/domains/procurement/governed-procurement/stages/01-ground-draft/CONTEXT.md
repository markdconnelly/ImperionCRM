# Stage 01 — ground-draft

**Job:** ground the approved sourcing need against the catalog and the Pax8 mirror, and
draft the order/PO that the money gate will present — cited, as-of-stamped, and
catalog-anchored; off-catalog PARKS to a human.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sourcing need | the run trigger payload (a `won-deal-sourcing` staged order, or a human-approved commit split from 02-B3/B5/B9) | one sourcing need | what is being ordered, for whom, and why |
| Product/service catalog | the catalog (#1306) via `pg.read` | the needed SKU(s) | the catalog anchor — SKU + list price; off-catalog = refuse-precondition |
| Owning account | silver `account` · `okf:account` | the subject account | who the buy is for (client — or Imperion-self, subject both) |
| Agreement | silver `contract` · `okf:contract` | the subject's agreement | the agreement the post-approval `agreement_attach` will bind to |
| Pax8 state | bronze `pax8_*` (read-only) | the subject's current subscriptions + pricing | Pax8 is SoR (A9a); current entitlements + the priced SKU as Pax8 sells it |
| Gate rules | `./skills/money-gate-rules.md` | catalog-anchor + easy-button fields | what the draft must carry for stage 02 to assemble the gate |

## Process

1. `[script]` Fix the **as-of date** for the run and read the sourcing need. Anchor each
   requested item to the catalog (#1306): resolve the catalog SKU and price.
   **Off-catalog → PARK to a human** (refuse-precondition — a catalog gap, never an
   improvised SKU, never auto-procured; vance.md).
2. `[script]` Resolve the owning `account` (client — or Imperion-self when the subject is
   Imperion's own need) and the `contract` the purchase will attach to. An unresolved
   account or agreement is a **noted gap that parks**, not a guess — a wrong owner here
   spends real money on the wrong client (vance.md §5).
3. `[sonnet]` Draft the order/PO: catalog SKU, quantity, the **exact $**, the Pax8 SoR
   state it was priced against (bronze `pax8_*`, read-only), and the grounded why —
   every figure with its **source + as-of date** (A5). Quantify the tradeoff per vance.md
   (the cost and the rejected alternative — a bare "buy" is not a decision).

## Outputs

`order-draft.md` — the catalog SKU + quantity + exact $, the owning account and agreement,
the Pax8-priced state (cited + as-of), the grounded why with the rejected alternative,
and any parked gap. Everything stage 02 needs to assemble the easy-button without
re-research.

## Audit

- [ ] Catalog-anchored: every item resolved to a catalog SKU (#1306); off-catalog PARKED to a human (refuse-precondition), never drafted around
- [ ] Every figure carries its source + as-of date (A5); the $ is exact, not estimated
- [ ] Owning account + agreement resolved (or the run parked on the gap, not guessed)
- [ ] Rejected alternative quantified (vance.md)
- [ ] No money actuation emitted from ICM — nothing ordered, provisioned, attached, or billed
