# Stage 01 — research

**Job:** turn a raw ticket-created event into one grounded issue dossier.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Ticket | the triggering row · silver `ticket` · `okf:ticket` | full row | the subject — symptom, reporter, affected CI, priority, status |
| Account | silver `account` · `okf:account` | the ticket's company | client context, environment scale |
| Contact | silver `contact` · `okf:contact` | the ticket's reporter | who reported it |
| Prior interactions | silver `interaction` · `okf:interaction` | recent entries for this account / ticket thread | repeat-issue signal |

## Process

1. `[script]` Load the ticket row by id from the trigger; extract title,
   description, reporter, company, any affected-CI / asset reference, priority,
   status, created/updated timestamps.
2. `[script]` Resolve the account and the reporting contact by id. Never create
   silver rows (the executor owns writes). Unresolvable → record `unresolved` with
   the reason.
3. `[haiku]` Pull recent interactions for this account / ticket thread; note any
   prior occurrence of the same symptom.
4. `[sonnet]` Write the issue dossier: a one-paragraph problem statement (symptom,
   scope, who is affected, since when), the named affected asset(s) if any, and an
   explicit "what we don't yet know" list.

## Outputs

`dossier.md` — problem statement · affected asset reference(s) or `none identified`
· reporter/account context · prior-occurrence note · open questions.

## Audit

- [ ] Ticket id, account, and reporter each resolved or explicitly `unresolved` with a reason
- [ ] Problem statement names the symptom and who is affected
- [ ] Affected asset reference captured, or `none identified`
