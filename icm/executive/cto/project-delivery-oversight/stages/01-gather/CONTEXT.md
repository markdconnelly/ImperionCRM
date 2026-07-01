# Stage 01 — gather

**Job:** assemble the cycle's project portfolio, the reactive-load reads, and the
Projects/Dispatch run-ledger / handoff signals into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Projects | silver `project` · `okf:project` | open portfolio — status, dates, health, provisioning state | the delivery picture |
| Tickets | silver `ticket` · `okf:ticket` | open reactive load on the portfolio's accounts | the collision signal |
| Accounts in scope | silver `account` · `okf:account` | accounts behind the projects | who the delivery is for |
| Projects/Dispatch run-ledger | `agent_run` (run-ledger, via `pg.read`) | recent Pierce / Scout runs | what Delivery has already acted on |
| Handoff signals | `relationship.*` (handoff bus, via `pg.read`) | open Projects/Dispatch signals | prior recovery / scheduling in motion |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's projects | recall, always cited |

## Process

1. `[script]` Pull the open project portfolio — status, planned vs actual dates,
   health, provisioning state — into a flat list keyed by project id. Read-only;
   never write.
2. `[script]` Pull the open reactive load (ticket counts and ages) for the
   portfolio's accounts; attach by account id.
3. `[script]` Read the Projects/Dispatch run-ledger (`agent_run`) and the
   `relationship.*` handoff bus via `pg.read`; attach any prior Pierce/Scout
   activity by project and account, id only.
4. `[haiku]` Recall prior context for the cycle's projects via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of projects keyed by project id with dates,
health, and provisioning state, the reactive load per account, the prior Delivery
activity, and cited recall items.

## Audit

- [ ] Every project names its project id and its account id, with dates and state as recorded
- [ ] Reactive load is attached per account (ticket ids/counts), no value invented
- [ ] Prior Projects/Dispatch activity is attached by id (run-ledger / handoff bus), no value invented
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no plan edited, no date committed, no technician committed
- [ ] No send/write/actuation occurred — Dexter delegated or parked
