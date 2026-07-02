# Money-gate rules (Mark-editable — approve-once + the easy-button + no-clean-undo + halt-no-rollback)

> DEFAULTS authored by the agent 2026-07-01. The rubric for `governed-procurement`: how
> the money gate is composed, what one approval covers, and how failure is surfaced.
> Mark: edit freely; stages cite this, nothing restates it.

## Approve-once at the money gate

**One human approval at `pax8_place_order` authorizes the WHOLE governed sequence**
(`pax8_place_order` → `m365_provision_license` → `agreement_attach` → `bill_attach` —
migration 0184; vance.md §6).

- The mechanical downstream steps (provision · attach · bill) auto-complete at L3 and are
  **never re-prompted** — re-asking a human to bless a step they already authorized as a
  package is a defect, not caution.
- The approval covers **this exact order**: SKU, quantity, dollars, account. Any change
  to any of those after approval = a **new spend = a new gate**. Nothing "adjusts" an
  approved order silently.
- A **rejection ends the run** with the reason captured; an edit-then-approve is kept as
  the approved version (the human's edit wins, ADR-0061 edit surface).

## The 4-part easy-button (A4)

The gate item a human sees carries exactly, in this order:

1. **The exact $** — the total spend, per-SKU, with the quantity. Never a range, never
   "approx".
2. **The SoR** — Pax8, and the bronze `pax8_*` state the price was read from.
3. **The grounded why** — who it's for, what triggered it, the rejected alternative
   (vance.md quantify-the-tradeoff), every figure with its source + **as-of date** (A5).
4. **One-click Approve / Reject-Edit** — the decision is one action; the human never
   reconstructs the case to make it.

Plus the flag below. An easy-button missing any part is not ready — it fails stage 02's
precondition check, it does not go to a human incomplete.

## The no-clean-undo flag (A10 row 4)

Every gate item is flagged: **money out has no clean undo.** A refund or credit is a
negotiation with a vendor, not an undo — which is exactly why this gate is permanent
(A2 class-1, `always_gate` forever, ADR-0109; no dial setting unlocks it). The flag is
presented, not implied: the approver sees the irreversibility before the click.

## Halt, no rollback (A10 / B6)

On partial failure of the post-approval tail: **HALT.** Never auto-rollback, never
improvise a compensating action (canceling an order is itself a money action → gated).

- Surface **completed-vs-pending** per step, plainly: what landed, what didn't, what the
  read-back showed.
- Recovery is a **re-run from the top**: every step is idempotency-keyed, so a replay is
  a no-op + audit note on completed steps (A9b) and picks up the pending ones. No
  double-buy, no double-bill.
- Every step closes only on a **read-back** from Pax8/M365 (A9c) — "the executor said so"
  is not confirmation; the mirror is.

## Catalog-anchored / off-catalog refuse-precondition

Vance procures ONLY what is in the product/service catalog (#1306; vance.md §3).
Off-catalog is a **catalog gap routed to a human** — the run PARKS before drafting; never
an improvised SKU, never a "closest match", never auto-procured. This is a
refuse-precondition: an off-catalog need cannot reach the money gate at all.

## Discipline

- **As-of + citation, always** (A5): every $, SKU, and entitlement carries its source and
  as-of date. An undated price is not a price.
- **Synthetic examples only; no client PII, no secrets** in any artifact of this workflow
  (ADR-0060). Accounts by business identifier; actuals live in the DB, not in files.
- Vendor pricing and terms **never cross a client or tenant boundary** (room.md, CS-08).
