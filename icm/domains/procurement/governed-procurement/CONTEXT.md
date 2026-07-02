# Workflow: governed-procurement (procurement v1)

**Job:** the ONE gated act path in procurement (Stream 02-B2, leaf #1487, archetype B6
money-gate). For an approved, catalog-anchored sourcing need: ground + draft the order/PO,
bring it to **THE money gate** with the 4-part easy-button (A4), **PARK** for the ONE human
approval that authorizes the whole Pax8 sequence (approve-once, migration 0184), then
document + verify the backend-executed operational tail. ICM **grounds, drafts, and
parks**; the backend executor actuates.

**Trigger:** an approved sourcing need — a catalog-anchored SKU to be ordered (a staged
order from `won-deal-sourcing`, or a human-approved commit split out of a Vance
detect/draft procedure — 02-B3/B5/B9). Off-catalog routes to a human
(refuse-precondition, never auto-procure — vance.md). One run per sourcing need.
**subject:** both (a client buy or Imperion's own).

**What this is NOT — NOT AN ACTUATOR.** No stage here places an order, provisions a
license, attaches an agreement, or attaches a bill. The 4-step sequence
`pax8_place_order` → `m365_provision_license` → `agreement_attach` → `bill_attach` is
seeded by **migration 0184 (postured `withheld` v1)** and executed by the **backend
executor** — there is no ICM send/actuate path and this workflow does not create one
(room.md: the one act path is backend-executed, never a workflow write). The money step
is `always_gate` **forever** — A2 class-1, dial-proof at every rung (ADR-0109); money out
has no clean undo (A10 row 4). Pax8 is the SoR; the app mirrors (A9a, room.md).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground-draft | `[hybrid]` Ground + draft the order/PO, catalog-anchored (#1306), cited + as-of; resolve the owning account; off-catalog → PARK to a human | — |
| 02 | money-gate | `[gui-step]` THE MONEY GATE — assemble the 4-part easy-button + no-clean-undo flag; **PARK** for the ONE human approval (approve-once, 0184) | **HARD CHECKPOINT — parks, always, at every rung** |
| 03 | post-approval-tail | `[automation]` Document + verify the backend-executed tail (provision · agreement · bill), idempotency-keyed + read-back (A9); halt-no-rollback on partial failure (A10) | — |

## Autonomy

Ships at **L0** (A3 ship-dial, ADR-0136); the earned cap is **L3** — the ONLY Vance L3,
and only on the **post-approval operational tail**: after the ONE human approval at
`pax8_place_order`, the backend-executed `m365_provision_license` · `agreement_attach` ·
`bill_attach` steps auto-complete at L3 (approve-once-at-the-money-gate, 0184; vance.md
§1) and stage 03 documents + verifies them without re-prompting. **The money step sits
above the whole ladder:** every purchase actuation is `always_gate` permanently — A2
class-1, dial-proof; no dial setting unlocks it (ADR-0109, room.md). Stage 02 parks in
every mode. The bill is the billing consequence of the approved purchase and seams to
Audrey [→ Stream 09] (A11). **Substrate (dormant, A5c):** 0184 is postured `withheld` v1;
Pax8-bronze, the Autotask write-back, and trigger-sync #119 are deploy-dormant — the
workflow ships propose-only until they land.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `money-gate-rules.md` (the approve-once rule, the
4-part easy-button composition, the no-clean-undo flag, halt-no-rollback, and the
catalog-anchored / off-catalog refuse-precondition). Mark-editable; stages cite, never
restate. Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
