# Stage 01 — renewal-context

**Job:** assemble the renewal's current terms and what's changed since last term.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Renewal | the triggering `opportunity` (`kind=renewal`) · `okf:opportunity` | current terms, amount, dates | the subject |
| Account | silver `account` · `okf:account` | the renewing account | relationship + size context |
| History | silver `interaction` · `okf:interaction` | this account's recent history | usage signals, tickets, sentiment |

## Process

1. `[script]` Resolve the renewal `opportunity` → current term, amount, and renewal date.
   Missing current terms → audit fail (cannot reprice an unknown baseline).
2. `[sonnet]` Summarize what's changed since last term: usage up/down, ticket load, new
   needs, sentiment signals from interactions. State only what's grounded; name the gaps.

## Outputs

`renewal-context.md` — current terms (amount, dates), the change summary, and the open
questions. No pricing proposed yet.

## Audit

- [ ] Current term + amount + renewal date stated (not blank)
- [ ] Change summary is grounded in interactions/usage, with gaps named — no invented trend
