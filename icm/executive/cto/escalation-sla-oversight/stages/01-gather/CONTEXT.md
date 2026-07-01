# Stage 01 — gather

**Job:** assemble the cycle's ticket backlog / SLA reads, the Service run-ledger and
handoff signals, and the devices/accounts in scope into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Tickets | silver `ticket` · `okf:ticket` | open + recently escalated (Autotask SoR, read) | backlog / SLA picture |
| Devices | silver `device` · `okf:device` | CIs behind the flagged tickets | blast radius per ticket |
| Accounts in scope | silver `account` · `okf:account` | accounts behind the backlog | who the exposure is for |
| Service run-ledger | `agent_run` (run-ledger, via `pg.read`) | recent Felix / Sage / Scout runs | what Delivery has already acted on |
| Handoff signals | `relationship.*` (handoff bus, via `pg.read`) | open Delivery signals | prior triage / escalation in motion |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's accounts | recall, always cited |

## Process

1. `[script]` Pull the ticket reads — open tickets with age, priority, status, and
   breach clock — into a flat list keyed by account. Read-only; never write.
2. `[script]` Read the Service run-ledger (`agent_run`) and the `relationship.*`
   handoff bus via `pg.read`; attach any prior Felix/Sage/Scout activity by ticket
   and account, id only.
3. `[script]` Resolve referenced devices and accounts from silver; attach id + name
   only.
4. `[haiku]` Recall prior context for the cycle's accounts via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of ticket/SLA signals keyed by account, with
the device and account ids in scope, the prior Delivery activity per ticket, and
cited recall items.

## Audit

- [ ] Every ticket signal names its ticket id and its account id
- [ ] Prior Delivery activity is attached by ticket/account id (run-ledger / handoff bus), no value invented
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no ticket touched, no note written, no client contacted
- [ ] No send/write/actuation occurred — Dexter delegated or parked
