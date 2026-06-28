# Stage 01 — renewal-context

**Job:** identify the renewal in range and read the account around it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Renewal | silver `opportunity` · `okf:opportunity` | the `kind=renewal` opp in range | the renewal subject |
| Account | silver `account` · `okf:account` | the owning account | the relationship |
| Contacts | silver `contact` · `okf:contact` | the account's contacts | who to involve |
| Service + engagement | silver `ticket` · `okf:ticket` / silver `interaction` · `okf:interaction` | recent | track record + sentiment |
| Strategic record | silver `strategic_business_review` · `okf:strategic_business_review` | latest | alignment |

## Process

1. `[script]` Resolve the renewal `opportunity` (`kind=renewal`) in range and its account.
   No resolvable renewal → audit fail.
2. `[script]` Read the contacts, recent service + engagement, and the strategic record.
3. `[haiku]` One-line statement of the renewal (what is renewing, when) — the readiness seed.

## Outputs

`renewal-context.md` — the renewal opp id, the resolved account id, the service/engagement
signals, and the one-line renewal statement.

## Audit

- [ ] Renewal opp id + account id stated (not blank)
- [ ] Service + engagement signals read (or noted absent)
- [ ] One-line renewal statement present
