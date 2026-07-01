# Stage 01 — gather

**Job:** assemble the cycle's legal/contract signals — the contract room,
Laurel's runs and handoff signals, and the counterparties in scope — into one
un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Contracts | silver `contract` · `okf:contract` | active + expiring in the horizon | agreements, expiry/renewal dates, terms |
| Sub-agent run ledger | `agent_run` (via pg.read) | Laurel's runs this cycle | what Legal actually did (review queue) |
| Handoff bus | handoff signals (via pg.read) | legal-domain activity this cycle | items moving between agents / to humans |
| Counterparties | silver `account` · `okf:account` | accounts behind the agreements | who each agreement binds us to |
| Attached deals | silver `opportunity` · `okf:opportunity` | deals an agreement attaches to | the commercial context of a term |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's themes | recall, always cited |

## Process

1. `[script]` Pull active and expiring agreements from the contract room into a
   flat list keyed by theme (expiry/renewal · review queue · obligation/risk).
   Read-only; never write.
2. `[script]` Pull Laurel's run ledger and handoff signals into the same flat
   list, tagged by theme. Read-only.
3. `[script]` Resolve counterparty accounts and any attached deal from silver;
   attach id + name only.
4. `[haiku]` Recall prior context for the cycle's themes via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of legal/contract signals tagged by theme
(expiry/renewal · review queue · obligation/risk), with the counterparty ids in
scope and cited recall items.

## Audit

- [ ] Every signal carries a theme tag (expiry/renewal · review queue · obligation/risk)
- [ ] Every agreement reference states its id and its expiry/renewal date where known
- [ ] Every counterparty reference states its id
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No send/write/actuation occurred — Rachel delegated or parked
