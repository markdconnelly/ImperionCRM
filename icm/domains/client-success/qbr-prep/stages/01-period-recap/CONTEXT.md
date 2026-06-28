# Stage 01 — period-recap

**Job:** read the review period and recap what actually happened.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Account | silver `account` · `okf:account` | the subject account | the review subject |
| Service history | silver `ticket` · `okf:ticket` | the review period | tickets resolved, SLA met/missed, incidents |
| Engagement | silver `interaction` · `okf:interaction` | the review period | touchpoints + sentiment |
| Transactions | silver `opportunity` · `okf:opportunity` | the period (incl. `kind=renewal`) | deals/renewals landed or in range |
| QBR record | silver `strategic_business_review` · `okf:strategic_business_review` | prior + cadence | the standing review record |

## Process

1. `[script]` Resolve the subject `account` and the review period (the quarter due).
2. `[script]` Read the service history (tickets resolved, SLA outcomes, any incident), the
   engagement, the transactions/renewals, and the prior QBR record.
3. `[haiku]` Draft the factual period recap — service delivered, projects landed, value
   realized — each figure with its source. Mixed signals are stated, not smoothed.

## Outputs

`recap.md` — the resolved account id, the review period, and the factual period recap.

## Audit

- [ ] Resolved account id + review period stated
- [ ] Service/SLA outcomes and transactions read (or noted absent)
- [ ] Recap is factual + signal-sourced (no promotional narration)
