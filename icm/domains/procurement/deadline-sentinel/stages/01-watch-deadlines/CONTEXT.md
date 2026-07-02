# Stage 01 — watch-deadlines

**Job:** read every renewal/cancellation clock — client agreements and Imperion's own — as of a stated date, and mark which clocks sit inside a lead-time rung.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Agreement clocks | silver `contract` · `okf:contract` | active agreements: renewal date, auto-renew flag, cancellation-window close | the renewal + cancellation clocks to watch |
| License entitlements | silver `license_assignment` · `okf:license_assignment` | entitlements tied to each expiring agreement | what the deadline commits or releases |
| Client spine | silver `account` · `okf:account` | owning account per agreement | whose clock — client agreement vs Imperion-self (subject: both) |
| Subscription state | `bronze pax8_*` (read-only) | subscription auto-renew / commitment-term dates on in-use SKUs | the Pax8-SoR mirror of the subscription clock (room.md) |
| Deadline rubric | `./skills/deadline-rubric.md` | lead-time ladder + as-of discipline | which clocks are due at T-30/T-7/T-1, what parks |

## Process

1. `[automation]` Fix the **as-of date** for the sweep (the snapshot date). Every
   days-to-deadline figure is derived against this date; an undated sweep is an audit fail.
2. `[automation]` Read every renewal/cancellation clock across both subjects — client vendor
   agreements AND Imperion's own subscriptions — **citing each renewal/cancel date with its
   source + as-of** (A5). An empty, missing, or unparseable date is **parked as a noted
   gap**, never guessed: a guessed clock is a silent auto-renew waiting to fire.
3. `[automation]` Evaluate each cited clock against the lead-time ladder
   (`deadline-rubric.md`: T-30 / T-7 / T-1) and mark the **due set** — the clocks inside a
   rung as of the sweep date — with each clock's rung and days-to-deadline (derived).

## Outputs

`deadlines.md` — the as-of date; every watched clock (agreement, owning account name,
renewal/cancel date + source, auto-renew flag, days-to-deadline, ladder rung); the due set
for stage 02; and every parked gap (empty/unparseable date), noted — not guessed.

## Audit

- [ ] As-of date stated (not blank); every clock cites its date + source + as-of (A5)
- [ ] Both subjects swept (client agreements AND Imperion's own subscriptions)
- [ ] Empty/unparseable dates parked as gaps, never guessed into
- [ ] No actuation / no money commitment emitted (watch only — no renew, cancel, buy, or order)
