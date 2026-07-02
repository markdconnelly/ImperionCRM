# Workflow: order-status-watchdog (procurement v1)

**Job:** watch every in-flight Pax8 order across its **placed → provisioned → billed**
ladder and alert on a stall or failure vs SLA — **order health assured**, no order dies
silently between the money gate and the bill. Realizes **02-B6**
(`docs/workflows/streams/02-lead-cash.md`, leaf #1485, archetype **B9 deadline-sentinel** —
it watches an order clock; it alerts, it never actuates).

**Trigger:** an in-flight Pax8 order — one placed through the governed procurement sequence
(02-B2) and not yet billed. The watchdog runs while any order is in flight; one run per
sweep.

**What this is NOT — NOT AN ORDER OPERATOR.** This workflow **never touches the order**: no
retry, no re-place, no cancel, no provisioning nudge (B9 — a watched clock is not a wheel to
turn). Pax8 is the system of record for orders (room.md); any fix or re-run of a stalled
sequence executes only through the **governed procurement sequence** (02-B2, migration 0184
— idempotent re-run from the top, replay = no-op, A9) behind its `always_gate` money gate
(ADR-0109). The watchdog's whole product is the timely, cited alert; a human (or 02-B2's
gate) acts.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | watch-orders | Read each in-flight order's state + transitions off Pax8 bronze; cite state + as-of | — |
| 02 | detect-alert | Classify stall/failure vs SLA; alert with computed urgency, routed to the order owner | **Order-owner alert loop** |

## Autonomy

Watch/alert; **tops out at L2** for this workflow (the day-job rung, room.md). Default rung
**L1** (draft the alert → park); every procedure **ships at L0** (ADR-0136 A3 ship-dial). At
**L2**, the stall/failure alert **auto-raises** to the human order owner (internal,
reversible — an alert can be dismissed). At NO rung does this workflow retry, re-place, or
cancel an order — actuation belongs to 02-B2 behind its money gate (0184). Every order state
carries its source and **as-of date** (A5); urgency is computed per A6 — an SLA-breaching
stall is urgent — never asserted.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `order-sla-rubric.md` (the placed→provisioned→billed
state ladder, stall/failure classification vs SLA, and the alert composition). Mark-editable;
stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`. The structured
manifest is `agent.yaml`; the composed prose is `prose.md`.
