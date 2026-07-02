# Stage 02 — detect-alert

**Job:** classify each in-flight order vs SLA and alert on every stall or failure with computed urgency.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Order ledger | `orders.md` (stage 01 output) | full | the cited states + time-in-state to classify |
| Billed consequence | silver `invoice` · `okf:invoice` | invoice presence on orders in the billed leg | confirms the billed terminal state off the QBO read-only mirror |
| Order-SLA rubric | `./skills/order-sla-rubric.md` | stall/failure classification + alert composition | the SLA windows, what counts as stall vs failure, the alert shape |

## Process

1. `[automation]` Classify each order against the SLA ladder (`order-sla-rubric.md`):
   **on-track** (inside its window), **stalled** (window exceeded, no error state), or
   **failed** (error/rejected state). The billed leg is confirmed against the `invoice`
   mirror; a bill the mirror hasn't caught up to is a **noted lag**, not a stall verdict —
   don't classify into a stale pull.
2. `[automation]` For each stall/failure, compose the alert per the rubric — order, owning
   account name, state + entered-at, the SLA window breached, dollars in flight — with
   **urgency computed per A6** (an SLA-breaching stall is urgent; a failed order with a
   client waiting outranks it). Every state and figure cites its source + as-of (A5).
3. `[automation]` Route each alert to the **human order owner**, pointing at the governed
   procurement sequence (02-B2) as the only fix path (idempotent re-run from the top, A9;
   money step `always_gate`, 0184). **Never auto-actuate the order** (B9): no retry,
   re-place, cancel, or provisioning nudge from this workflow.

## Outputs

`alert.md` — per stalled/failed order: the classification + its evidence (state, entered-at,
window breached, each cited + as-of), dollars in flight, computed urgency + its inputs, the
route taken to the order owner, and the 02-B2 pointer. On-track orders: a one-line healthy
roll-up. Terminal stage; ends parked with the order owner.

## Audit

- [ ] Every classification cites the state + as-of it was derived from (A5); mirror lag noted, not classified into
- [ ] Urgency computed per A6 (inputs shown), never asserted
- [ ] Every stall/failure alerted and routed to the order owner with the 02-B2 pointer
- [ ] No actuation / no money commitment emitted (no retry, re-place, cancel, or nudge — B9)

## Checkpoint

The order-owner alert loop: a human reads the stall/failure alert and decides the fix; any
re-run executes only through the governed procurement sequence (02-B2, 0184 — idempotent,
gated). **`auto` (L2) may self-approve raising the alert ONLY** — there is no order action
in this workflow's catalog at any rung (sentinel, not operator — room.md; vance.md §6).
