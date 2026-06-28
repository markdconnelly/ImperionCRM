# Stage 01 — gather-context

**Job:** read the whole account into one place — the relationship, the transactions, the
engagement + service history, and the QBR substrate.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Account | silver `account` · `okf:account` | the subject account | the relationship kernel |
| Contacts | silver `contact` · `okf:contact` | the account's contacts | who we work with |
| Transactions | silver `opportunity` · `okf:opportunity` | open + recent (incl. `kind=renewal`) | the commercial picture |
| Engagement + service | silver `interaction` · `okf:interaction` / silver `ticket` · `okf:ticket` | recent history | sentiment + service friction signals |
| QBR substrate | silver `strategic_business_review` · `okf:strategic_business_review` | latest + cadence | the strategic-review record |

## Process

1. `[script]` Resolve the subject `account`. A thin or unresolvable account → audit fail
   (no account to plan).
2. `[script]` Read the contacts, the open/recent opportunities (including renewals), the
   recent interactions + tickets, and the latest QBR record + cadence.
3. `[haiku]` One-paragraph standing summary of the account as it is today — the seed the
   trajectory read builds on.

## Outputs

`context.md` — the resolved account id, the contact roster, the open/recent opportunities,
the engagement + service signals, the QBR cadence, and the one-paragraph standing summary.

## Audit

- [ ] Resolved account id stated (not blank)
- [ ] Opportunities, interactions/tickets, and QBR substrate read (or noted absent)
- [ ] Standing summary present (not a raw dump)
