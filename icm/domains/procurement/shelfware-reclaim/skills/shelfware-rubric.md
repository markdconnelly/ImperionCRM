# Shelfware rubric (Mark-editable — what counts + the $ method + the commit-splits-out rule)

> DEFAULTS authored by the agent 2026-07-01. The rubric for `shelfware-reclaim`: what
> counts as shelfware, the unused-vs-unassigned distinction, how reclaimable $ is
> quantified, and the hard rule that the commit splits out. Mark: edit freely; stages cite
> this, nothing restates it.

## What counts as shelfware

A **paid-for entitlement with no working consumer**, as of a stated date. Two classes:

| Class | Definition | Typical action |
|---|---|---|
| **Unassigned** | paid quantity > assigned quantity on `license_assignment` (seats bought, never given to anyone) | cancel/downgrade the surplus quantity |
| **Unused** | assigned, but the assignment shows no active consumer (e.g. the assigned user/account is disabled or offboarded per the assignment facts) | reassign first if a need exists; else cancel/downgrade |

NOT shelfware: an entitlement inside a deliberate buffer the budget owner has attested
(note it, don't flag it); a seat assigned within the current billing period (too fresh to
call); anything where assignment data is missing or stale — that is a **data gap to park**,
never a candidate (A5 empty→park). When utilization telemetry beyond the assignment facts
does not exist, say so — classify on what `license_assignment` + Pax8 actually show, and
never guess a usage level (vance.md §5).

## Unused vs unassigned — why the split matters

Unassigned surplus is the safe reclaim (nobody loses a tool). Unused-but-assigned needs a
human sanity check before cancel — the assignment may be seasonal or role-based. The
recommendation for an unused seat therefore always names **reassign** as the considered
alternative, accepted or rejected with a reason.

## The $ quantification method

- **Measured:** the per-unit cost, read from the `invoice` mirror line for that
  subscription (preferred) or the Pax8 bronze price (fallback) — cite which, + as-of.
- **Derived:** reclaimable $ = measured unit cost × reclaimable quantity, stated
  per-month and annualized. Label derived figures as derived.
- **Term-aware:** if the subscription has a committed term, the near-term reclaim is $0
  until the term boundary — say so, and stamp the boundary date. The recommendation then
  rides the renewal clock (the Deadline Sentinel, 02-B1, owns that clock).
- A candidate with no measured cost anywhere is reported with the gap, never an estimate.

## The commit-splits-out rule (hard)

This workflow **measures and drafts. It NEVER commits.**

- Every cancel/downgrade is a **money commitment**: `always_gate` forever (ADR-0109,
  migration 0184) — no dial setting unlocks it. It runs ONLY through the
  **governed-procurement money gate (02-B2)** after one human approval.
- B4's line: an **assertion-with-spend is not a measurement** (A11). The finding and the
  commit are separate artifacts; stage 03 stages gate items, it never actuates.
- No Pax8 push, no silver write, no external message — Pax8 is the SoR and the mirror is
  read-only (room.md).

## Discipline

- **Cite + as-of on everything** (A5): every candidate carries its entitlement citation
  and snapshot date; an undated claim is an audit fail.
- **Pool stays internal** (A7): cross-client shelfware patterns inform Vance's read but
  never appear in any client-visible artifact, and vendor pricing never crosses a client
  or tenant boundary (CS-08 §5, room.md).
- **No PII, no row-level values committed.** Report by account/SKU (business
  identifiers); query the live read-only DB for actuals. Synthetic example shape:
  "Client A — 25× SKU-X paid, 18 assigned → 7 unassigned @ $12/mo measured (invoice
  mirror, as-of 2026-07-01) → $84/mo derived reclaim."
