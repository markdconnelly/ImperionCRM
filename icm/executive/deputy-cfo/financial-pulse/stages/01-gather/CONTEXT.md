# Stage 01 — gather

**Job:** assemble the cycle's finance, revenue, and pipeline reads and the accounts
in scope into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Invoices (AR) | silver `invoice` · `okf:invoice` | open + aging (QBO read-only mirror) | AR / aging picture |
| Generated invoices | silver `generated_invoice` · `okf:generated_invoice` | current drafts | app-native billing in flight |
| Time records | silver `time_record` · `okf:time_record` | current period | billable/cost basis |
| Timesheets | silver `timesheet` · `okf:timesheet` | current period | labor capacity/cost |
| Expense items | silver `expense_item` · `okf:expense_item` | current period | cost-to-serve inputs |
| Expense reports | silver `expense_report` · `okf:expense_report` | current period | OOP cost rollup |
| Opportunities | silver `opportunity` · `okf:opportunity` | open pipeline + renewals | revenue/pipeline picture |
| License assignments | silver `license_assignment` · `okf:license_assignment` | active | recurring revenue / true-up |
| Accounts in scope | silver `account` · `okf:account` | accounts behind the activity | who the finance is for |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's themes | recall, always cited |

## Process

1. `[script]` Pull the finance/revenue/pipeline reads into a flat list keyed by
   theme (AR/AP, margin inputs, revenue, pipeline). Read-only; never write.
2. `[script]` Resolve referenced accounts from silver; attach id + name only.
3. `[haiku]` Recall prior context for the cycle's themes via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of finance/revenue/pipeline signals tagged by
theme, with the account ids in scope and cited recall items.

## Audit

- [ ] Every signal carries a theme tag (AR/AP / margin / revenue / pipeline)
- [ ] Every account reference states its id
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no financial record written, no money moved
