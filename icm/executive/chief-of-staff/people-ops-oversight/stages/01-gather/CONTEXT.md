# Stage 01 — gather

**Job:** assemble the cycle's People/HR signals — Holly's runs, handoff signals,
and parked checkpoints — into one un-ranked gather record, values-free.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sub-agent run ledger | `agent_run` (via pg.read) | Holly's runs this cycle | what People/HR actually did |
| Handoff bus | handoff signals (via pg.read) | people-domain activity this cycle | items moving between agents / to humans |
| Parked checkpoints | `agent_run` parked/awaiting rows (via pg.read) | people domain | what is waiting on a human |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's themes | recall, always cited |

## Process

1. `[script]` Pull Holly's run ledger and handoff signals into a flat list keyed
   by lifecycle theme (onboarding / offboarding / records / requests). Read-only;
   never write.
2. `[script]` Pull the parked checkpoints into the same flat list, tagged with how
   long each has been waiting. Read-only.
3. `[script]` Strip values: an item is referenced by id, kind, and age — never by
   a comp, salary, or personal-data value.
4. `[haiku]` Recall prior context for the cycle's themes via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of People/HR signals tagged by lifecycle
theme, with parked items and their ages, and cited recall items — referenced by
id/kind, never by personal value.

## Audit

- [ ] Every signal carries a lifecycle theme tag (onboarding / offboarding / records / requests)
- [ ] Every parked item states how long it has been waiting
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No comp, salary, or personal-data VALUE appears anywhere in the record
- [ ] No send/write/actuation occurred — Rachel delegated or parked
