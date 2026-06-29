# Stage 01 — gather

**Job:** assemble the cycle's division revenue/pipeline outputs and the accounts
in scope into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sub-agent run ledger | `agent_run` (via pg.read) | Chase/Belle runs this cycle | what Sales/Marketing actually did |
| Handoff bus | `relationship.*` handoff signals (via pg.read) | Sales/Marketing activity this cycle | demand + bookings signals between agents |
| Opportunities | silver `opportunity` · `okf:opportunity` | open pipeline + renewals | forward-pipeline / forecast picture |
| License assignments | silver `license_assignment` · `okf:license_assignment` | active | recurring revenue / true-up |
| Accounts in scope | silver `account` · `okf:account` | accounts behind the activity | who the pipeline is for |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's themes | recall, always cited |

## Process

1. `[script]` Pull the run ledger and the handoff-bus signals into a flat list
   keyed by theme (bookings, open pipeline, demand). Read-only; never write.
2. `[script]` Pull the pipeline rooms (opportunities, license assignments) into
   the same flat list, tagged by theme. Read-only.
3. `[script]` Resolve referenced accounts from silver; attach id + name only.
4. `[haiku]` Recall prior context for the cycle's themes via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of revenue/pipeline signals tagged by theme
(bookings / open pipeline / demand), with the account ids in scope and cited
recall items.

## Audit

- [ ] Every signal carries a theme tag (bookings / open pipeline / demand)
- [ ] Every account reference states its id
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked
