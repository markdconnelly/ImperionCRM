# Workflow: won-deal-sourcing (procurement v1)

**Job:** turn a won deal into a sourcing draft ready for the money gate (Stream 02-B10,
leaf #1820, archetype A11 seam → B6 staging). Receive the won deal's sold line-items off
the Chase→Vance seam, map them to catalog SKUs with the cost and the rejected alternative
quantified, and **stage the order for the `governed-procurement` money gate** —
procurement prepared, nothing bought.

**Trigger:** a won opportunity whose sold line-items require licenses/SKUs — the
Chase→Vance seam off the ADR-0096 spine [← Chase 02-A6]. One run per won opportunity.
**subject:** client — or Imperion-self when Imperion "wins" an internal need.

**What this is NOT — NOT A BUY.** Nothing here places an order, spends a dollar, or
touches Pax8/M365. The buy itself is `always_gate` forever and lives at the
`governed-procurement` money gate (02-B2 — A2 class-1, ADR-0109, migration 0184); this
workflow only drafts and stages for it. An off-catalog line-item is a catalog gap routed
to a human (refuse-precondition — never an improvised SKU, vance.md); an empty or
ambiguous line-item set parks (A5) — a guessed sourcing plan buys the wrong thing.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | receive-seam | `[automation]` Receive the won deal's catalog-anchored line-items (cited + as-of); empty/ambiguous → park | — |
| 02 | draft-sourcing | `[hybrid]` Draft the sourcing plan — line-item → catalog SKU, cost + rejected alternative quantified; off-catalog → human | — |
| 03 | stage-order | `[automation]` Stage the order for the governed-procurement money gate; emit the Pierce delivery seam | — |

## Autonomy

Ships at **L0** (A3 ship-dial, ADR-0136); the earned cap is **L2** — the internal draft +
stage, all reversible artifacts (a staged order can be withdrawn; nothing external moves).
At L2 the whole receive → draft → stage run auto-completes, ending **staged for the
02-B2 money gate**, where the buy is `always_gate` at every rung (room.md's money
ceiling). Off-catalog line-items route to a human in every mode (refuse-precondition);
an empty/ambiguous seam payload parks in every mode (A5). The staged order also seams to
Pierce's delivery-procurement [→ Stream 03] (A11 — a governed event, not a send).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `sourcing-rubric.md` (line-item → SKU mapping
discipline, catalog anchoring, the stage-for-gate handoff shape, and the subject rule).
Mark-editable; stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
