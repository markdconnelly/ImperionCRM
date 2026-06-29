# Stage 01 — gather

**Job:** assemble the cycle's run-ledger and handoff signals, the margin and renewal
reads, and the accounts in scope into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sub-agent run ledger | `agent_run` · run-ledger (via `pg.read`) | Finance / Client Success / Sales runs this cycle | what the sub-agents have already done |
| Handoff signals | `relationship.*` · handoff bus (via `pg.read`) | Finance / Client Success / Sales signals this cycle | live division activity not yet in silver |
| Time records | silver `time_record` · `okf:time_record` | current period | billable / cost basis for margin |
| Timesheets | silver `timesheet` · `okf:timesheet` | current period | labor capacity / cost |
| Expense items | silver `expense_item` · `okf:expense_item` | current period | cost-to-serve inputs |
| Expense reports | silver `expense_report` · `okf:expense_report` | current period | OOP cost rollup |
| Invoices | silver `invoice` · `okf:invoice` | current period (QBO read-only mirror) | invoiced revenue for margin |
| Opportunities | silver `opportunity` · `okf:opportunity` | open renewals | the renewal book |
| License assignments | silver `license_assignment` · `okf:license_assignment` | active | recurring revenue / true-up |
| Accounts in scope | silver `account` · `okf:account` | accounts behind the activity | who the margin/renewal is for |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's themes | recall, always cited |

## Process

1. `[script]` Read the sub-agent run ledger (`agent_run`) and the `relationship.*`
   handoff bus via `pg.read` for Finance / Client Success / Sales activity; attach each
   as a tagged signal with its source reference. Read-only; never write.
2. `[script]` Pull the margin and renewal reads (time, timesheets, expense items +
   reports, invoices, opportunities, license assignments) into a flat list keyed by
   theme (margin / renewal). Read-only.
3. `[script]` Resolve referenced accounts from silver; attach id + name only.
4. `[haiku]` Recall prior context for the cycle's themes via the retrieval tier; attach
   each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of run-ledger / handoff signals and
margin / renewal reads tagged by theme, with the account ids in scope and cited recall
items.

## Audit

- [ ] Every signal carries a theme tag (margin / renewal) or a ledger / handoff source
- [ ] `agent_run` and `relationship.*` are cited as run-ledger / handoff bus, never with an `okf:` marker
- [ ] Every account reference states its id
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked
