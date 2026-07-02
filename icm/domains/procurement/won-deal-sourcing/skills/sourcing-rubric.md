# Sourcing rubric (Mark-editable — line-item → SKU mapping + catalog anchor + the stage-for-gate handoff shape)

> DEFAULTS authored by the agent 2026-07-01. The rubric for `won-deal-sourcing`: how a
> won deal's sold line-items become a stageable order. Mark: edit freely; stages cite
> this, nothing restates it.

## Line-item → SKU mapping discipline

A sold line-item becomes a sourcing line ONLY by an **exact catalog match**:

- **SKU** — the product/service catalog entry (#1306) the line-item names or
  unambiguously corresponds to. No fuzzy match, no "closest equivalent", no substituting
  a cheaper tier the deal didn't sell.
- **Quantity** — from the sold line-item, verbatim. A missing quantity is an ambiguity
  → park (stage 01), not a default of 1.
- **Delta check** — before sourcing, check the account's existing entitlements
  (`license_assignment` + the Pax8 mirror): source the **delta** between what was sold
  and what the account already holds. Double-buying a live license is shelfware created
  on day one (vance.md's own beat).
- **Price** — the Pax8-mirrored price, cited + as-of (A5). A price without an as-of date
  is not a price; a remembered price is a guess (vance.md §5).

## Catalog anchoring (the refuse-precondition)

Vance sources ONLY what is in the catalog (#1306; vance.md §3). A sold line-item with no
catalog match is a **catalog gap routed to a human** — it may mean the catalog needs a
new entry, or the deal sold something the company doesn't deliver; either way that is a
human's call. Never improvise a SKU to keep the run moving, and never stage a plan with
an unresolved item — a partial buy under-delivers a won deal.

## The stage-for-gate handoff shape

The staged order (stage 03 → `governed-procurement`) carries, per SKU, everything the
gate workflow's stage 01 needs to ground **without re-research**:

| Field | Content |
|---|---|
| SKU | the catalog entry (#1306) |
| Quantity | from the sold line-item (post delta check) |
| Exact $ | unit + total, the Pax8-mirrored price, cited + as-of |
| Account / subject | the owning account; `client` or `imperion` |
| Grounding | the won `opportunity` reference + the sold line-item it realizes (the why) |
| Alternative | the rejected alternative + why (vance.md quantify-the-tradeoff) |

Staging creates a **pending gate item** — it authorizes nothing. The buy is decided by a
human at the 02-B2 money gate (`always_gate` forever, ADR-0109, migration 0184); this
workflow's scope ends at the handoff (vance.md §7).

## Subject rule

Default **`client`** — the won deal's account is a client and the sourcing is for them.
**`imperion`** when Imperion "wins" an internal need (the company buying for itself
through the same governed path — same catalog anchor, same gate, same rules). The subject
travels with the staged order; it never flips mid-run.

## Discipline

- **As-of + citation, always** (A5): every item, price, and entitlement carries its
  source and as-of date.
- **Synthetic examples only; no client PII, no secrets** in any artifact of this
  workflow (ADR-0060). Accounts by business identifier; actuals live in the DB.
- Vendor pricing and terms **never cross a client or tenant boundary** (room.md, CS-08).
