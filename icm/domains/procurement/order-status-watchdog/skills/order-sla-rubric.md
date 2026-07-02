# Order-SLA rubric (Mark-editable — the state ladder + stall/failure classification + alert shape)

> DEFAULTS authored by the agent 2026-07-01. The rubric for `order-status-watchdog`: the
> healthy order ladder, the SLA windows, what counts as a stall vs a failure, and what a
> complete alert carries. Mark: edit freely (the SLA windows especially — they are
> placeholders until real Pax8 timings are observed); stages cite this, nothing restates it.

## The state ladder (placed → provisioned → billed)

A healthy Pax8 order walks three legs; Pax8 is the system of record for all of them
(room.md). Default SLA windows, derived in whole business days against the sweep's as-of
date:

| Leg | Healthy window (default) | Confirmed by |
|---|---|---|
| **placed → provisioned** | 2 business days | Pax8 bronze order state |
| **provisioned → billed** | 1 billing cycle | Pax8 bronze + the `invoice` QBO read-only mirror |
| **billed** (terminal) | — | order complete; the watchdog drops it |

The windows above are **defaults, not observations** — tighten or loosen them as real order
timings accumulate. Time-in-state is **derived** against the as-of date; the state and its
entered-at timestamp are **measured** — label which is which.

## Stall vs failure

- **On-track** — inside its leg's window. Roll up in one healthy line; no alert.
- **Stalled** — window exceeded, no error state. The order is alive but late; an
  **SLA-breaching stall is urgent** (A6).
- **Failed** — an error/rejected/cancelled-by-vendor state, at any age. Outranks a stall:
  someone (often a client) is waiting on a license that will not arrive without action.
- **Mirror lag ≠ stall.** A provisioned order whose bill hasn't landed on the `invoice`
  mirror yet may be pull-lag, not a breach — note the lag with the mirror's as-of and hold
  the verdict; never classify into a stale pull.
- **Unrecognized state = a gap.** Park it, cited; never map an unknown Pax8 state onto the
  ladder by guess.

## Alert composition

Every stall/failure alert carries, each item cited + as-of (A5):

- **The order** — order id, SKU, quantity, owning account (business name only).
- **The evidence** — current state, entered-at, the window breached, time-in-state.
- **Dollars in flight** — the order's committed spend (from the placed order's terms).
- **Computed urgency (A6)** — from the classification (failed > stalled), the dollars, and
  who waits (a client-facing provisioning stall outranks an internal one). Report the
  urgency WITH its inputs; a bare "urgent" is an asserted one.
- **The fix pointer** — the governed procurement sequence (02-B2, migration 0184): re-run
  is idempotent from the top (replay = no-op + audit note, A9), the money step is
  `always_gate` (ADR-0109). The alert points; it never pushes.

## The watchdog-never-actuates rule (hard — B9)

- **No retry, no re-place, no cancel, no provisioning nudge — ever, at any rung.** The
  watchdog watches a clock; turning the wheel is 02-B2's, behind its money gate.
- **Output is internal** — a reversible, internal `operational`-class alert (room.md). It
  informs the order owner; it never acts on the order.

## Discipline

- **Cite + as-of (A5)** on every state, timestamp, and dollar figure.
- **No PII, no row-level values committed.** Accounts by business name; order details by
  id; query the live read-only DB for actuals. Synthetic example: "Order PX-1042 — Client
  B, CollabSuite ×10, placed 2026-06-27, still `placed` at as-of 2026-07-01 = 3 business
  days → stalled, window 2."
