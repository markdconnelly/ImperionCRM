# Workflow: shelfware-reclaim (procurement v1)

**Job:** sweep the license estate for **paid-for-but-unassigned/unused licenses**, quantify
the reclaimable dollars, and draft a **reclaim recommendation** (cancel/downgrade) with the
cost, the utilization, and the rejected alternative attached — then park it. Realizes
**02-B3** (leaf [#1482](https://github.com/markdconnelly/ImperionCRM/issues/1482), archetype
**B4 audit-attest**, ADR-0136). Vance **detects and drafts**; a human spends.

**Trigger:** schedule — the periodic shelfware sweep over entitlements vs assignments
(`license_assignment` + the Pax8 bronze mirror). One run per as-of date.

**What this is NOT — detection and recommendation ONLY.** This workflow never cancels,
downgrades, or touches a subscription. Every cancel/downgrade is a **money commitment**,
`always_gate` forever (ADR-0109, migration 0184) — no dial setting unlocks it — and it
**splits out to the governed-procurement money gate (02-B2)**, where ONE human approval
authorizes the governed sequence. B4's line holds throughout: an **assertion-with-spend is
not a measurement** — the sweep measures; the commit is a separate, gated act (A11). Pax8
stays the system of record (room.md); nothing here writes silver or pushes to Pax8.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | detect-shelfware | Sweep entitlements vs assignments; cite each unassigned/unused entitlement + as-of | — |
| 02 | quantify-compose | Quantify reclaimable $; draft the reclaim rec (cancel/downgrade) | — |
| 03 | route | Raise the internal finding; split every commit out to the 02-B2 money gate | **reclaim-rec loop** |

## Autonomy

Per-procedure rung **L2** (detect + flag + draft = internally reversible, A10 row 1);
**ships at L0** per the A3 ship-dial (ADR-0136) — the rung is the earned cap, not the
day-one floor. Default rung L1 (draft → park, room.md). At L2 the internal shelfware
finding + reclaim recommendation auto-raises; the cancel/downgrade **commit never runs
here at any rung** — it is `always_gate` (0184) and lives in the governed-procurement
money gate (02-B2). Every cited entitlement carries its source + as-of date (A5).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `shelfware-rubric.md` (what counts as shelfware,
the unused-vs-unassigned distinction, the $ quantification method, and the
commit-splits-out rule). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
