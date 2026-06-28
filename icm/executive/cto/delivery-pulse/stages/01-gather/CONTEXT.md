# Stage 01 — gather

**Job:** assemble the cycle's delivery telemetry and the CIs/accounts in scope into
one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delivery telemetry | sub-agent run ledger · `agent_run` + health/SLA signals | current cycle, delivery division | backlog / SLA / incidents / problems / change calendar / capacity |
| Tickets in scope | silver `ticket` · `okf:ticket` | open + recently-breaching | backlog + SLA picture |
| Devices / CIs | silver `device` · `okf:device` | CIs tied to active incidents/changes | asset context for risk |
| Cloud assets | silver `cloud_asset` · `okf:cloud_asset` | cloud CIs tied to active changes | change-blast-radius context |
| Accounts in scope | silver `account` · `okf:account` | accounts behind the activity | who delivery is for |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's themes | recall, always cited |

## Process

1. `[script]` Pull the cycle's delivery signals (run ledger, health/SLA, change
   calendar) into a flat list keyed by signal type.
2. `[script]` Resolve referenced tickets, devices, cloud assets, and accounts from
   silver; attach id + name only.
3. `[haiku]` Recall prior context for the cycle's themes via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of delivery signals tagged by type, with the
ticket/device/cloud-asset/account ids in scope and cited recall items.

## Audit

- [ ] Every signal carries a type tag (backlog / SLA / incident / problem / change / capacity)
- [ ] Every CI / account reference states its id
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No client PII or secrets present (audit by reference)
