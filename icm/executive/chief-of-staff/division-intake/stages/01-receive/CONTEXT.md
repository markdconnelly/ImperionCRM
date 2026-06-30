# Stage 01 — receive

**Job:** take Nova's delegated unit and confirm it belongs to this division, then
ground the minimal people/legal context needed to pick a report.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delegated unit | the `delegate` from Nova's `intake-route` | the intent + carried constraints + resolved entities + asking-human authority | what to route |
| Accounts | silver `account` · `okf:account` | the account(s) the unit concerns (e.g. a contract counterparty) | who the unit is about |
| Contacts | silver `contact` · `okf:contact` | the person(s) the unit concerns (e.g. an employee or signatory) | who the unit is about |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this thread's history | recall, always cited |

## Process

1. `[script]` Read Nova's delegated unit: the intent, the carried constraints
   (consent/deadline/authority), and the already-resolved entities. Nova did the
   entity resolution — do not re-resolve.
2. `[sonnet]` Confirm the unit belongs to the Internal Ops / G&A division. If it
   does not, mark it return-to-Nova (do not route it onward by guess).
3. `[script]` Pull the minimal people/legal context for the account(s)/contact(s)
   in scope — the signals that disambiguate which report owns it (a people/lifecycle
   matter vs a contract/legal one). Read-only; never write; salary/comp/personal
   data is never pulled into the receipt.
4. `[haiku]` Recall prior context for the thread via the retrieval tier; attach each
   item with its source reference. A miss is recorded as "no recall," never guessed.

## Outputs

`receipt.md` — the confirmed in-division unit (or a return-to-Nova flag), the carried
intent + constraints + authority, the account(s)/contact(s) in scope, the
disambiguating people/legal signals, and cited recall items (or "no recall").

## Audit

- [ ] The unit is confirmed in-division, or explicitly flagged return-to-Nova — never routed onward by guess
- [ ] Carried constraints (consent/deadline/authority) preserved from Nova's delegation
- [ ] Entity references carry ids; none re-invented (Nova resolved them)
- [ ] Every recall item carries a source reference; a miss is "no recall," not a guess
- [ ] Read-only — no record written, nothing actuated; no salary/comp/personal data surfaced (two-axis RLS)
