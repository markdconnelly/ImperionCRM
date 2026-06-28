# Invoice-draft pre-check rubric (Mark-editable)

> DEFAULTS authored by the agent 2026-06-27 — Mark: edit freely, this file is the
> canonical anomaly checklist for the pre-QBO-push review (stages cite it, nothing
> restates it). No prices, no client identifiers, no values live here — this file
> describes *how to check*, never *what a specific invoice says*.

## The frame: flag before the push

The draft under review is a `generated_invoice` — the app-native invoice draft that
sits **before** the Mark-gated QuickBooks Online push (ADR-0085, #1095). This review
is the last cheap moment to catch a money error: once pushed, the error is on a
client's invoice. So the verdict you produce is a *hold-or-clear before the push*,
never a correction and never the push itself. Audrey reads and flags; a human (and
QBO) acts.

## The four anomaly classes

Check every draft against all four. Each names the signal it is checked against —
the source of truth you tie the draft line back to.

| # | Anomaly | What it looks like | Signal it is checked against |
|---|---|---|---|
| 1 | **Missing line** | An expected billable item is absent from the draft (attested work or a contracted recurring item with no matching line) | attested time facts; the agreement/contract line set |
| 2 | **Rate-vs-contract mismatch** | A line's unit rate does not match the agreed contract/true-up rate for that item | the contract/true-up rate (the agreement license facts) |
| 3 | **Hours ≠ attested time** | A line's billed quantity (hours) does not equal the attested time behind it | the attested time fact (the approved timesheet) |
| 4 | **Math error** | A line's `quantity × rate` ≠ its line amount, or the line amounts do not sum to the draft total | the draft's own arithmetic (internal consistency) |

## Tie-out discipline

A finance flag is the arithmetic, never a vibe (audrey.md). For every anomaly,
write the tie-out:

- **Inputs** — the figures you weighed (the draft line; the signal figure).
- **Expected** — what the line should be, from the signal.
- **Actual** — what the draft says.
- **Delta** — expected minus actual (and its direction: over- or under-billed).
- **As-of** — the as-of date of each figure (the draft's, and each signal's).

Then a one-line verdict per line: `ties out` | `anomaly: <class>` | `cannot verify
(gap)`.

## Measured vs. derived — and never estimate into a gap

- A check is **measured** only when both sides of the tie-out have a real signal:
  the billed hours have a matching attested-time figure, the billed rate has a
  matching contract-rate figure. A measured anomaly is a confident flag.
- A check is **derived** when one side is inferred rather than read — say so, and
  label the flag derived.
- If the signal needed to verify a line is **missing** (no attested time, no
  contract rate), the line is `cannot verify (gap)`. **Do not estimate the missing
  figure to force a verdict** (audrey.md): escalate the gap. A confident wrong flag
  is worse than an honest "this line is not reconcilable yet, hold the push."

## What this review is NOT

- **Not a correction.** Audrey never edits the invoice draft and never adjusts a
  line — she flags; a human corrects (ADR-0123 / ADR-0085).
- **Not the push.** The QBO push is external and Mark-gated; it is never part of
  this review in any mode.
- **Not a salary disclosure.** Hours tie out against attested time, never against a
  per-person Pay Rate; the salary non-disclosure rule (audrey.md) holds — report
  matched / mismatch by amount, never an individual rate.
