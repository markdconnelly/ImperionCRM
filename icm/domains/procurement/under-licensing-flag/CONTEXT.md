# Workflow: under-licensing-flag (procurement v1)

**Job:** cross-reference license entitlements against **what the service catalog says
SHOULD be licensed** (#1306), classify any under-licensing / license-compliance exposure by
severity, and raise a **compliance-exposure flag** — risk surfaced, dollars later. Realizes
**02-B4** (leaf [#1483](https://github.com/markdconnelly/ImperionCRM/issues/1483), archetype
**B4 audit-attest**, internal — measure + flag, no external attestation; ADR-0136). Vance
errs to **risk over cost-cutting** (vance.md §3).

**Trigger:** schedule — the periodic under-licensing / compliance-exposure sweep vs the
service catalog (#1306). One run per as-of date.

**What this is NOT — detection and flagging ONLY.** This workflow never buys, true-ups, or
changes a license to close an exposure, and it never quietly picks the cheaper
under-licensed path to save a dollar — an exposure beats a saving, always (vance.md §3).
Any remediation buy is a money commitment, `always_gate` forever (ADR-0109, migration
0184), and **splits out to the governed-procurement money gate (02-B2)**. B4: the flag is a
**measurement**; the remediation is an assertion-with-spend and travels separately (A11).
No silver write, no Pax8 push, no external message (room.md).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | crossref-entitlements | Cross-ref entitlements vs the catalog's should-be-licensed baseline; cite catalog version + as-of | — |
| 02 | classify-flag | Classify exposure severity; raise the compliance-exposure flag | **exposure-flag loop** |

## Autonomy

Per-procedure rung **L2** (detect + flag = internally reversible, A10 row 1); **ships at
L0** per the A3 ship-dial (ADR-0136) — the rung is the earned cap, not the day-one floor.
Default rung L1 (draft → park, room.md). At L2 the internal compliance-exposure flag
auto-raises; any remediation **buy never runs here at any rung** — it is `always_gate`
(0184) and lives in the governed-procurement money gate (02-B2). Every exposure carries
the catalog version it was judged against + its as-of date (A5); severity drives computed
urgency (A6), not volume.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `compliance-exposure-rubric.md` (the exposure
classes, the severity ladder, and the risk-over-cost rule). Mark-editable; stages cite,
never restate. Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
