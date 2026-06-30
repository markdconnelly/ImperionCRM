# Stage 01 — receive

**Job:** take Nova's delegated unit and confirm it belongs to this division, then
ground the minimal finance/revenue context needed to pick a report.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delegated unit | the `delegate` from Nova's `intake-route` | the intent + carried constraints + resolved entities + asking-human authority | what to route |
| Accounts | silver `account` · `okf:account` | the account(s) the unit concerns | who the unit is about |
| Opportunities | silver `opportunity` · `okf:opportunity` | open pipeline/renewal tied to the account | is this a pipeline/renewal matter |
| Invoices | silver `invoice` · `okf:invoice` | open/aging tied to the account | is this an AR/finance matter |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this thread's history | recall, always cited |

## Process

1. `[script]` Read Nova's delegated unit: the intent, the carried constraints
   (consent/budget/deadline/authority), and the already-resolved entities. Nova did
   the entity resolution — do not re-resolve.
2. `[sonnet]` Confirm the unit belongs to the Revenue/Client/Finance division. If it
   does not, mark it return-to-Nova (do not route it onward by guess).
3. `[script]` Pull the minimal finance/revenue context for the account(s) in scope —
   open opportunity / aging invoice signals that disambiguate which report owns it.
   Read-only; never write.
4. `[haiku]` Recall prior context for the thread via the retrieval tier; attach each
   item with its source reference. A miss is recorded as "no recall," never guessed.

## Outputs

`receipt.md` — the confirmed in-division unit (or a return-to-Nova flag), the carried
intent + constraints + authority, the account(s) in scope, the disambiguating
finance/revenue signals, and cited recall items (or "no recall").

## Audit

- [ ] The unit is confirmed in-division, or explicitly flagged return-to-Nova — never routed onward by guess
- [ ] Carried constraints (consent/budget/deadline/authority) preserved from Nova's delegation
- [ ] Entity references carry ids; none re-invented (Nova resolved them)
- [ ] Every recall item carries a source reference; a miss is "no recall," not a guess
- [ ] Read-only — no financial record written, no money moved, nothing actuated
