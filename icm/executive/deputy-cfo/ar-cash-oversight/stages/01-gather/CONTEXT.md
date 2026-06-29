# Stage 01 — gather

**Job:** assemble the cycle's AR / cash reads, the Finance run-ledger and handoff
signals, and the accounts in scope into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Invoices (AR) | silver `invoice` · `okf:invoice` | open + aging (QBO read-only mirror) | AR / aging picture |
| Generated invoices | silver `generated_invoice` · `okf:generated_invoice` | in flight (drafts + sent) | app-native billing in flight |
| Accounts in scope | silver `account` · `okf:account` | accounts behind the receivables | who the AR is for |
| Finance run-ledger | `agent_run` (run-ledger, via `pg.read`) | recent Audrey runs | what Finance has already acted on |
| Handoff signals | `relationship.*` (handoff bus, via `pg.read`) | open Finance signals | prior dunning / collections in motion |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's accounts | recall, always cited |

## Process

1. `[script]` Pull the AR reads — open + aging invoices and generated invoices in
   flight — into a flat list keyed by account. Read-only; never write.
2. `[script]` Read the Finance run-ledger (`agent_run`) and the `relationship.*`
   handoff bus via `pg.read`; attach any prior Audrey dunning/collections activity by
   account, id only.
3. `[script]` Resolve referenced accounts from silver; attach id + name only.
4. `[haiku]` Recall prior context for the cycle's accounts via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of AR / cash signals keyed by account, with the
account ids in scope, the prior Finance activity per account, and cited recall items.

## Audit

- [ ] Every AR signal names its account id and its invoice/generated-invoice id
- [ ] Prior Finance activity is attached by account id (run-ledger / handoff bus), no value invented
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked
