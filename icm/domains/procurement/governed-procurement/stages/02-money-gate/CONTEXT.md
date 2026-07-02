# Stage 02 — money-gate  ·  HARD CHECKPOINT

**Job:** THE MONEY GATE (Stream 02-B2). Assemble the 4-part easy-button and **PARK** —
ONE human approval at `pax8_place_order` authorizes the whole sequence (approve-once,
migration 0184). `always_gate`, at every rung, in every mode; there is NO ICM
send/actuate path.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Order draft | `order-draft.md` (stage 01 output) | full | the thing being approved |
| Gate rules | `./skills/money-gate-rules.md` | easy-button composition + no-clean-undo flag | how the gate item is assembled |

## Process

1. `[script]` Verify preconditions: stage 01's audit is green, the draft is
   catalog-anchored (an off-catalog item cannot reach this gate — it parked at stage 01),
   and it carries the exact $, the SKU, and the as-of date. A draft that fails cannot
   reach a human as "ready".
2. `[script]` Assemble the **4-part easy-button** (A4) per `money-gate-rules.md`:
   the **exact $** · the **SoR (Pax8)** · the **grounded why** (cited + as-of, with the
   rejected alternative) · one-click **Approve / Reject-Edit** — flagged with the
   **no-clean-undo irreversibility marker** (A10 row 4: money out has no clean undo).
3. **HARD CHECKPOINT — PARK.** The workflow parks here and ends its turn; a human
   decides. ONE approval at `pax8_place_order` authorizes the WHOLE 4-step sequence
   (approve-once, 0184) — the mechanical downstream steps are never re-prompted
   (vance.md §6). On approval, the **backend executor** runs the sequence; ICM emits
   nothing. Rejection (or edit-then-reject) ends the run with the reason captured.

## Outputs

`gate-record.md` — the presented easy-button (all 4 parts + the no-clean-undo flag), the
decision (`approved` / `rejected` / `parked`), the human approver identity, and the
timestamp. Only an `approved` record admits stage 03.

## Audit

- [ ] The easy-button carried all 4 parts (exact $ · Pax8 SoR · grounded why with source + as-of · Approve/Reject-Edit) plus the no-clean-undo flag (A10 row 4)
- [ ] The workflow **PARKED at the gate** — no auto-approval at any rung, in any mode (A2 class-1, dial-proof, ADR-0109)
- [ ] Decision + human approver identity recorded (never blank, never `auto`)
- [ ] No money actuation emitted from ICM — the actuation, if approved, is the backend executor's (0184)

## Checkpoint

THE MONEY GATE — permanent, dial-proof (`always_gate`, A2 class-1, ADR-0109; seeded by
0184, postured `withheld` v1). A human approves the exact purchase; their ONE approval
authorizes `pax8_place_order` and the whole downstream sequence (approve-once — the
operational steps auto-complete in stage 03 and are never re-prompted). **`auto` may
self-approve NOTHING here** — money out has no clean undo (A10 row 4); the spend is a
human's (vance.md §7). There is no ICM send/actuate path; the run parks until the human
decides.
