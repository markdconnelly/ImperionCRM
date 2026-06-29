# Stage 02 — synthesize

**Job:** turn the gather record into an aging-bucketed, exposure-ranked roll-up with
the flags isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Bucket AR by aging — current / 30 / 60 / 90+ — per account; collapse
   duplicates across invoices and generated invoices.
2. `[sonnet]` Compute the cash exposure: total open AR and the at-risk slice (60+ and
   90+), each tied to its accounts.
3. `[sonnet]` Rank by overdue and at-risk amount, highest exposure leading; isolate
   the flags — aged receivables and concentration risk (a single account carrying a
   disproportionate share) — each with the exposure stated.
4. `[sonnet]` Cross-correlate the flags against prior Finance activity internally only
   — pool, never bleed; nothing here is client-facing.

## Outputs

`synthesis.md` — an aging-bucketed, exposure-ranked roll-up (highest exposure
leading) and a separate flag list, each item naming the account and the overdue /
at-risk amount, and noting any prior Finance activity already in motion.

## Audit

- [ ] AR is bucketed by aging (current / 30 / 60 / 90+) per account
- [ ] Cash exposure stated, with the at-risk (60+ / 90+) slice broken out
- [ ] Roll-up is exposure-ranked, highest overdue/at-risk leading
- [ ] Every flag names an account and states the overdue/at-risk amount
- [ ] Cross-correlation is internal only — no client-facing content produced
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked
