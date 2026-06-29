# Workflow: close-won-handoff (sales v1)

**Job:** when an `opportunity` reaches **`won`**, stamp it closed-won (close date +
attribution — an internal, reversible write) and emit the **two governed seams** that
carry the deal out of sales: the **sale→delivery hand-off to Pierce** (ADR-0096,
catalog-anchored line-items select the delivery template #1306 → Stream 03) and the
relationship **Hand-off to Celeste** (→ Stream 08). This is the Chase→delivery seam
emitter — Chase closes; Pierce and Celeste actuate. (Stream 02-A6; the A11 seam.)

**Trigger:** an `opportunity` reaches **`won`** — KQM `status==3` ⇔ `salesOrderId>0`
(KQM is the quote/order SoR, ADR-0080; the agent mirrors). One run per won opportunity.

**Seam, not a send:** the close-won crossing is a **deterministic governed event**, not
an outbound actuation and not a self-approval. There is no separate hand-off action and
no new tool — the won-detection IS the hand-off. The DocuSign contract-signed gate is a
HARD precondition on **Pierce's provisioning** side (A11 — the gate is on the actuator,
not on Chase's close); nothing customer-facing originates here.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | detect-stamp | Detect `won`; stamp closed-won + close date + attribution (`opportunity.write`, internal/reversible — L2) | **L2 self-approve** |
| 02 | emit-delivery | Emit the sale→delivery hand-off (ADR-0096): catalog-anchored line-items select the template (#1306) → Pierce / Stream 03 | — |
| 03 | emit-relationship | Emit the relationship Hand-off → Celeste / Stream 08 (terminal) | — |

## Autonomy

Starts `draft` (ADR-0061). The flip to `auto` is admin-only and reversible
(`autopilot_policies`). At **L2**, stage 01 may self-approve the closed-won
`opportunity.write` ONLY when the won-detection audit is green — the stamp is internal
and reversible. The **two emits** (stages 02/03) are **deterministic governed events**,
not actuations and not self-approvals — the won-detection IS the hand-off; the seam rule
is governed config, executed mechanically. Anything customer-facing, the provisioning
itself, and any audit failure park for a human in every mode (anything not named here
parks by default). #991 (the hand-off bus) is dormant in v1 → the emits are
**propose-only** until it lands (A5c).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `handoff-contract.md` (what each seam carries +
the DocuSign-on-Pierce precondition). Domain-shared (Tier 2):
`domains/sales/skills/voice-and-tone`. Mark-editable business content; stages cite,
never restate. Rules of the format: `../../../CONVENTIONS.md`. The structured manifest
is `agent.yaml`; the composed workflow prose is `prose.md`.
