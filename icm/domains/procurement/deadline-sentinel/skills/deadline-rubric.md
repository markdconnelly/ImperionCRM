# Deadline rubric (Mark-editable — lead-time ladder + urgency computation + sentinel-never-actuates)

> DEFAULTS authored by the agent 2026-07-01. The rubric for `deadline-sentinel`: which
> clocks fire when, how urgency is computed, and the hard rule that a deadline never
> licenses an actuation. Mark: edit freely; stages cite this, nothing restates it.

## The lead-time ladder

Every renewal/cancellation clock is watched at three policy lead times, derived in whole
days against the sweep's as-of date:

| Rung | Fires | Means |
|---|---|---|
| **T-30** | 30 days before the deadline | first alert + drafted recommendation — the decision window opens |
| **T-7** | 7 days before | urgency raise; unanswered T-30 climbs `reports_to` |
| **T-1** | 1 day before | final alert; unanswered T-7 has already climbed — this is the last cited warning |

The **deadline** is whichever clock closes first on an agreement: the auto-renew date or
the cancellation-window close (they differ — an auto-renew with a 30-day notice clause has
its real deadline at renewal-minus-notice, not at renewal). Watch the earlier one. A clock
with no parseable date is **parked as a gap**, never guessed — a guessed clock is a silent
auto-renew.

## Urgency computation (A6 — computed, never asserted)

Urgency is a function of three cited inputs, each with its as-of date:

- **Days-to-deadline** — the ladder rung (T-1 > T-7 > T-30).
- **Dollars at stake** — the committed spend if the clock fires (price × quantity × term,
  from the Pax8 bronze / contract read).
- **Inaction-consequence class** — *auto-renew* (money committed by silence) outranks
  *manual-renew lapse* (service ends, recoverable); a **closing cancellation window is
  urgent** at any dollar figure — the option itself is what expires.

Report the computed urgency WITH its three inputs so a human can re-derive it. Never emit a
bare "urgent" — an uncomputed urgency is an asserted one.

## Routing & escalation

- **Client-contract renewal** → seam to **Chase (02-A7)**: the client conversation is his;
  Vance attaches the numbers (cost · utilization · rejected alternative, vance.md §3).
- **Imperion-own subscription** → the budget owner, up Sterling's line (room.md).
- **Unanswered rung** → escalate up `reports_to` with urgency recomputed for the tighter rung.
- **Passed deadline** → a **logged escalation failure**, surfaced in the owning C-suite
  synthesis-brief. The log entry names the deadline, the rungs alerted, and who went
  unanswered — accountability, not actuation.

## The sentinel-never-actuates rule (hard — B9)

A missed, passed, or closing deadline **does not license an autonomous commitment.**

- **No renew, no cancel, no buy, no order placed — ever, at any rung.** The actuation is
  architecturally `always_gate` (ADR-0109, migration 0184); no dial setting unlocks it. It
  executes only in the **governed procurement sequence** (02-B2, leaf #1487) after ONE human
  approval at the money gate.
- **The guarantee is the alert + the drafted recommendation** (BO-03 Procurement §5 via
  vance.md §6). Deadline pressure changes the urgency number, never the authority.
- **Output is internal** — a reversible, internal `operational`-class alert/draft (room.md).
  It informs a human; it never commits money.

## Discipline

- **Cite + as-of (A5).** Every renewal/cancel date, dollar figure, and utilization count
  carries its source and the as-of date it was read at. Days-to-deadline and urgency are
  **derived**; the dates and dollars are **measured** — label which is which.
- **Park, don't guess.** An empty/unparseable date, a missing price, an unknown utilization
  → a noted, escalated gap (vance.md §5). Never estimate into a clock or a cost.
- **No PII, no cross-boundary terms.** Accounts by business name only; vendor pricing and
  contract terms never cross a client or tenant boundary (CS-08 via room.md). Synthetic
  example: "Client A — WidgetSuite 25 seats, auto-renew 2026-08-15, notice T-30 → real
  deadline 2026-07-16."
