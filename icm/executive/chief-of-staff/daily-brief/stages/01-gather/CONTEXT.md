# Stage 01 — gather

**Job:** assemble the day's raw cross-division status and the accounts/contacts in
play into one un-prioritized gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Division status | sub-agent run ledger · `agent_run` / health & SLA signals | last 24h, all divisions | what moved / what's stuck |
| Accounts in play | silver `account` · `okf:account` | accounts referenced by the day's activity | who the status is about |
| Contacts in play | silver `contact` · `okf:contact` | contacts on those accounts | the human side of the status |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this day's themes | recall, always cited |

## Process

1. `[script]` Pull the last 24h of cross-division signals (run ledger, health/SLA)
   into a flat list keyed by division.
2. `[script]` Resolve referenced accounts/contacts from silver; attach name + id
   only. No PII beyond what a status line needs; salary/comp/personal data never
   loaded.
3. `[haiku]` Recall prior context for the day's themes via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-prioritized list of cross-division signals, each tagged
with its division and (where relevant) the account/contact id, plus cited recall
items. No ranking here.

## Audit

- [ ] Every signal carries a division tag
- [ ] Every account/contact reference states its id (not free text)
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No salary/comp/personal data present
