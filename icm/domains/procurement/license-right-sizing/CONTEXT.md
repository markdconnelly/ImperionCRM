# Workflow: license-right-sizing (procurement v1)

**Job:** match SKU and quantity against **actual utilization**, find over-provisioning and
consolidatable SKUs, and draft a **right-sizing recommendation** (consolidate/downgrade)
with the dollars attached — then surface it and park. Realizes **02-B5** (leaf
[#1488](https://github.com/markdconnelly/ImperionCRM/issues/1488), archetype **B4
audit-attest**, ADR-0136). Every recommendation carries the cost, the utilization, and the
rejected alternative (vance.md §3).

**Trigger:** schedule — the periodic utilization analysis over the license estate. One run
per as-of date.

> **Scope note:** the full vendor-record model is a stub
> ([#1311](https://github.com/markdconnelly/ImperionCRM/issues/1311)) — this workflow's
> scope is **license/SKU right-sizing off the data that exists** (`license_assignment` +
> the Pax8 bronze mirror + the invoice mirror). Whole-vendor optimization waits for #1311
> (and lives in 02-B9 `consolidation-advisory`).

**What this is NOT — analysis and recommendation ONLY.** This workflow never consolidates,
downgrades, or cancels anything. Every right-sizing actuation is a money commitment,
`always_gate` forever (ADR-0109, migration 0184), and **splits out to the
governed-procurement money gate (02-B2)**. B4: the utilization match is a **measurement**;
the consolidate/downgrade is an assertion-with-spend and travels separately (A11). It also
never right-sizes BELOW the service-catalog baseline — under-licensing exposure beats a
saving (vance.md §3; that boundary is policed by 02-B4 `under-licensing-flag`). No silver
write, no Pax8 push, no external message (room.md).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | match-utilization | Match SKU/quantity to actual utilization; cite utilization data + as-of; park missing-data gaps | — |
| 02 | compose-rec | Draft the right-sizing rec (consolidate/downgrade), dollars attached | — |
| 03 | route | Surface the recommendation; split every commit out to the 02-B2 money gate | **right-sizing loop** |

## Autonomy

Per-procedure rung **L2** (detect + draft = internally reversible, A10 row 1); **ships at
L0** per the A3 ship-dial (ADR-0136) — the rung is the earned cap, not the day-one floor.
Default rung L1 (draft → park, room.md). At L2 the internal right-sizing recommendation
auto-raises; the consolidate/downgrade **commit never runs here at any rung** — it is
`always_gate` (0184) and lives in the governed-procurement money gate (02-B2). Every
figure carries its utilization source + as-of date (A5); missing utilization data parks
the item, never a guess.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `right-sizing-rubric.md` (the utilization
thresholds, the SKU-consolidation patterns, and the quantify-the-tradeoff shape).
Mark-editable; stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
