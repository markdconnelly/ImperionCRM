# Workflow: vendor-risk-eol (procurement v1)

**Job:** detect a vendor risk or end-of-life signal — a price hike, an EOL/EOS announcement,
vendor instability — characterize it with the exposure quantified, correlate it across the
client base **internally only**, and hand the advisory to **Celeste** as a vCIO /
client-relationship signal. Realizes **02-B8**
(`docs/workflows/streams/02-lead-cash.md`, leaf #1486, archetype **B9 deadline-sentinel →
Celeste seam** — it watches an EOL/risk clock; it advises, it never actuates).

**Trigger:** a vendor risk/EOL signal (price hike, EOL, vendor instability) — surfacing in
the Pax8 bronze catalog/pricing state on an in-use SKU, or arriving as a routed observation.
One run per signal.

**What this is NOT — NOT A VENDOR SWITCH.** This workflow **never actuates**: no vendor
switch, cancellation, migration, or term renegotiation, at any rung (B9). Any replacement
buy or cancel the advisory motivates is `always_gate` (ADR-0109, migration 0184) and
executes only through the **governed procurement sequence** (02-B2, leaf #1487) after a
human approves at the money gate. Nor is it the client conversation: the client-facing
framing of the risk is **Celeste's** (the vCIO seam, → Stream 08) — Vance characterizes and
hands off; the cross-client correlation he computes stays internal (A7 pool-never-bleed).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | detect-signal | Detect and classify the risk/EOL signal; cite the signal + as-of | — |
| 02 | advise-handoff | Characterize + quantify exposure, pool-correlate internally only, hand to Celeste | **Celeste-seam handoff loop** |

## Autonomy

Detect/flag/advise; **tops out at L2** for this workflow (the day-job rung, room.md).
Default rung **L1** (draft the advisory → park); every procedure **ships at L0** (ADR-0136
A3 ship-dial). At **L2**, the characterized advisory **auto-raises and hands to Celeste**
(internal, reversible — an advisory can be withdrawn). At NO rung does this workflow switch,
cancel, migrate, or renegotiate a vendor — actuation belongs to 02-B2 behind its money gate
(0184). Every signal and exposure figure carries its source and **as-of date** (A5); the
cross-client view is computed internally only and never bleeds to any client (A7).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `risk-eol-rubric.md` (the signal classes, the
characterization fields, the internal-only pool-correlation rule, and the Celeste handoff
shape). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
