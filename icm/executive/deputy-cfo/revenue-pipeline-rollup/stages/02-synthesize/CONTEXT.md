# Stage 02 — synthesize

**Job:** turn the gather record into a slippage-ranked forecast roll-up with the
flags isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Roll up the signals into the forecast / pipeline picture (bookings,
   open pipeline, demand); collapse duplicates across accounts.
2. `[sonnet]` Rank by slippage and at-risk commits — stalled opportunities,
   slipping close dates, soft renewals — highest exposure leading.
3. `[sonnet]` Isolate the flags — stalled/slipping opportunities and at-risk
   commits — each with the account and the exposure stated.

## Outputs

`synthesis.md` — slippage-ranked forecast roll-up (highest at-risk commit leading)
and a separate flag list, each item naming the account/opportunity and the
exposure.

## Audit

- [ ] Roll-up is slippage-ranked, highest at-risk commit leading
- [ ] Every flag names an account/opportunity and states the exposure
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Pool-never-bleed — cross-correlated internally only; nothing client-facing
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked
