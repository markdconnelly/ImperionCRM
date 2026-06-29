# Stage 02 — synthesize

**Job:** turn the gather record into a leakage-ranked partner-economics roll-up with
the flags isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Compute partner contribution: roll up co-sell/referral deal value and
   attribution by partner; collapse duplicates across accounts.
2. `[sonnet]` Compute MDF ROI: spend against sourced/influenced revenue per
   request; surface poor-ROI MDF.
3. `[sonnet]` Compute referral-payout economics: pending vs approved vs paid against
   the deals they reward; surface over-committed or at-risk payouts.
4. `[sonnet]` Rank by leakage: poor-ROI MDF and over-committed/at-risk referral
   economics leading; isolate the flags, each with the exposure stated.

**Pool, never bleed:** cross-correlate signals internally only — the roll-up is
oversight for Nick, never client- or partner-facing.

## Outputs

`synthesis.md` — leakage-ranked partner-economics roll-up (highest leakage leading)
and a separate flag list, each item naming the partner/deal/area and the exposure.

## Audit

- [ ] Roll-up is leakage-ranked, highest exposure leading
- [ ] MDF ROI and payout economics each computed, not just listed
- [ ] Every flag names a partner/deal/area and states the exposure
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Cross-correlation stayed internal — nothing client- or partner-facing
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked
