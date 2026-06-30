# Stage 01 — renewal-context

**Job:** identify the renewal in range and read the account around it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Renewal | silver `opportunity` · `okf:opportunity` | the `kind=renewal` opp in range | the renewal subject |
| Agreement | silver `contract` · `okf:contract` | the account's active agreement(s) | expiry date + terms — the renewal facts (#1687) |
| Account | silver `account` · `okf:account` | the owning account | the relationship |
| Contacts | silver `contact` · `okf:contact` | the account's contacts | who to involve |
| Service + engagement | silver `ticket` · `okf:ticket` / silver `interaction` · `okf:interaction` | recent | track record + sentiment |
| Strategic record | silver `strategic_business_review` · `okf:strategic_business_review` | latest | alignment |

## Process

1. `[script]` Resolve the renewal `opportunity` (`kind=renewal`) in range and its account.
   No resolvable renewal → audit fail.
2. `[script]` Read the account's active `contract`(s) — expiry date + terms — to ground the
   renewal facts (the agreement; the `opportunity` is the deal, the `contract` is the dates/terms).
3. `[script]` Read the contacts, recent service + engagement, and the strategic record.
4. `[haiku]` One-line statement of the renewal (what is renewing, when) — the readiness seed.

## Outputs

`renewal-context.md` — the renewal opp id, the resolved account id, the contract expiry +
terms, the service/engagement signals, and the one-line renewal statement.

## Audit

- [ ] Renewal opp id + account id stated (not blank)
- [ ] Contract expiry date + terms read (or noted absent — never inferred)
- [ ] Service + engagement signals read (or noted absent)
- [ ] One-line renewal statement present
