# Workflow: vendor-cost-variance (procurement v1)

**Job:** monitor vendor cost off the **invoice mirror + `license_assignment` true-up facts
+ contract terms**, compute the variance against expected cost, and raise a
**cost-variance flag handed to Audrey** for reconciliation/true-up. Realizes **02-B7**
(leaf [#1484](https://github.com/markdconnelly/ImperionCRM/issues/1484), archetype **B4
audit-attest → Audrey seam**, ADR-0136). **Vance MEASURES; Audrey owns the money clock**
(A11 obligation/action separation).

**Trigger:** schedule — the vendor cost refresh; a run computes variance vs expected. One
run per as-of date.

**What this is NOT — measurement and handoff ONLY, read-only money.** This workflow never
reconciles, credits, true-ups, disputes, or moves a dollar. The measure/own split is the
whole design (A11): Vance computes what the cost IS vs what it SHOULD be and hands the
variance to **Audrey**, whose stream owns reconciliation/true-up (→ Stream 09) — **the
money commitment is gated on Audrey's side**, and any procurement-side remediation (a
true-up buy, a term change) is `always_gate` forever (ADR-0109, migration 0184) at the
governed-procurement money gate (02-B2). No silver write, no QBO/Pax8 push, no external
message; QBO and Pax8 stay the systems of record (room.md).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | monitor-cost | Compute actual vs expected vendor cost; cite the cost source + as-of on every figure | — |
| 02 | flag-handoff | Raise the variance flag; SEAM → hand to Audrey for reconciliation/true-up | **Audrey-seam loop** |

## Autonomy

Per-procedure rung **L2** (monitor + flag → Audrey = internally reversible, A10 row 1);
**ships at L0** per the A3 ship-dial (ADR-0136) — the rung is the earned cap, not the
day-one floor. Default rung L1 (draft → park, room.md). At L2 the variance flag
auto-raises and the Audrey handoff auto-emits (an internal seam, reversible); **no money
act runs here at any rung** — the money commitment is gated on Audrey's side (A11), and
procurement-side remediation is `always_gate` (0184) at 02-B2. Every figure carries its
cost source + as-of date (A5); variance size drives computed urgency (A6).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `variance-rubric.md` (the expected-cost derivation,
the variance thresholds, the Audrey handoff shape, and the measure-vs-own split).
Mark-editable; stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
