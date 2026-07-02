# Stage 02 — draft-sourcing

**Job:** draft the sourcing plan — map each sold line-item to a catalog SKU with the
cost and the rejected alternative quantified; off-catalog routes to a human.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Line-items | `line-items.md` (stage 01 output) | full | the sold items to source |
| Product/service catalog | the catalog (#1306) via `pg.read` | the needed SKU(s) | the catalog anchor — SKU + list price; off-catalog = refuse-precondition |
| Existing entitlements | silver `license_assignment` · `okf:license_assignment` | the owning account's current licenses | buy the delta, not a duplicate — what the account already holds |
| Pax8 state | bronze `pax8_*` (read-only) | the account's subscriptions + pricing | Pax8 is SoR (A9a); the priced SKU as Pax8 sells it, as-of |
| Sourcing rubric | `./skills/sourcing-rubric.md` | mapping discipline + catalog anchor | how a line-item becomes a SKU; when an item routes to a human |

## Process

1. `[script]` Map each line-item to a catalog SKU per `sourcing-rubric.md` (#1306) —
   exact catalog match, quantity from the sold line-item. Check the account's existing
   entitlements (`license_assignment`) and the Pax8 mirror so the plan sources the
   **delta**, not a duplicate of something already licensed.
2. `[script]` **Off-catalog line-item → route to a human** (refuse-precondition — a
   catalog gap, never an improvised SKU, never a "closest match"; vance.md). A plan with
   an unresolved item **parks** rather than staging incomplete — a partial buy against a
   won deal under-delivers what was sold.
3. `[sonnet]` Draft the sourcing plan: per SKU — quantity, unit + total cost (the Pax8
   price, cited + as-of, A5), and the **rejected alternative** (vance.md
   quantify-the-tradeoff: name the dollars and the under-licensing risk on each side —
   risk beats saving a dollar).

## Outputs

`sourcing-plan.md` — per-SKU: catalog SKU, quantity, cost (cited + as-of), the rejected
alternative, the entitlement-delta note; plus the owning account/subject and any item
routed to a human as a catalog gap.

## Audit

- [ ] Every line-item mapped to a catalog SKU (#1306) or routed to a human as a catalog gap — no improvised SKU, no closest-match
- [ ] Every figure carries its source + as-of date (A5); costs read from the Pax8 mirror, not invented (vance.md §5)
- [ ] Existing entitlements checked — the plan sources the delta, not a duplicate
- [ ] Rejected alternative quantified per vance.md (dollars + under-licensing risk both named)
- [ ] No money actuation emitted from ICM — nothing ordered, provisioned, or billed
