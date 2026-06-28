# Renewal margin rubric (Mark-editable — compute, floor, flag thresholds, tie-out)

> DEFAULTS authored by the agent 2026-06-28. The rubric for `renewal-margin`: how to compute
> and compare margin, the margin floor, the flag thresholds, the tie-out discipline, and the
> advise-only discipline. Mark: edit freely — these are starting numbers, tune them. Stages
> cite this, nothing restates it.

## What margin means here

- **Historical margin** = realized margin from the company's own invoice record (the QBO
  read-only mirror): per the renewal subject (account / agreement), revenue billed minus
  the cost to serve. **Cost-allocation views are unbuilt (#1044)** — there is no
  cost-allocation entity to read yet. Until they land, Audrey grounds historical margin on
  the **invoice** revenue side and the cost inputs available on the invoice itself, and
  **notes the cost-side gap explicitly** (a partial-cost margin is labeled derived, not a
  measured full margin). When the cost-allocation views are built, fold them in here.
- **Proposed renewal margin** = the margin implied by **Chase's proposed renewal pricing**
  (arrives as a Chase handoff, not finance silver — Audrey does not read the opportunity)
  measured against the same cost basis used for historical.
- **License facts** (the agreement/true-up quantities) ground the per-unit and seat-count
  side of both figures.

## The margin floor

- The **margin floor** is the lowest acceptable proposed margin for a renewal — the
  threshold below which the deal needs a human decision. DEFAULT starting value:
  **30% gross margin** on the renewal. Mark: set this per the company's actual policy /
  per service line.
- A proposed margin **below the floor** is a **hard flag** (below-floor).

## Flag thresholds

| Signal | Compare | Hard flag? |
|---|---|---|
| Proposed margin below the floor | proposed margin vs floor | yes — below-floor flag |
| Proposed margin well below historical | proposed margin vs historical margin | yes — well-below-historical flag (DEFAULT threshold: proposed is **≥ 10 margin-points** below the historical margin, or a **≥ 25% relative** drop — Mark, tune) |
| Proposed margin at/above floor and near historical | both | no — note, don't flag |
| Cost side unavailable (cost-allocation unbuilt, #1044) | — | escalate the gap; do not flag a number you could not compute |

## The tie-out discipline (every flag shows its arithmetic)

A finance flag is not "this margin looks thin." It is: the **inputs** weighed (the revenue,
the cost basis, the seat/quantity), the **expected** value (floor / historical), the
**actual** (proposed margin), the **delta**, and the **as-of date** — and a label of
**measured figure vs derived**. A bare assertion is not a flag (audrey.md).

## Discipline

- **Don't estimate into a data gap.** Missing data — most pointedly the unbuilt
  cost-allocation cost side (#1044) — means escalate the gap; never guess a number to fill
  it (audrey.md). A confident wrong margin is worse than an honest "the cost side isn't
  reconcilable yet."
- **Measured vs derived.** Label which figures are read directly (invoice revenue) and which
  are computed (margin, proposed-vs-historical delta). A partial-cost margin is derived.
- **Advise, never block, never move money.** Audrey supplies the margin intel and the flag;
  the renewal block/approve is a **human decision** and the renewal send-for-signature is
  already `always_gate` on the Chase side (#1415). Audrey informs Chase; she does not gate
  Chase. No posting, no QBO push, no send, ever (QBO is the system of record, ADR-0123).
