# Stage 01 — receive

**Job:** take Nova's delegated unit and confirm it belongs to this division, then
ground the minimal assurance context needed to pick a report.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delegated unit | the `delegate` from Nova's `intake-route` | the intent + carried constraints + resolved entities + asking-human authority | what to route |
| Accounts | silver `account` · `okf:account` | the account(s) the unit concerns | who the unit is about |
| Entity cross-reference | silver `entity_xref` · `okf:entity_xref` | the resolved entity identity Nova carried | confirm the unit's subject without re-resolving |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this thread's history | recall, always cited |

## Process

1. `[script]` Read Nova's delegated unit: the intent, the carried constraints
   (consent/deadline/authority), and the already-resolved entities. Nova did the
   entity resolution — do not re-resolve.
2. `[sonnet]` Confirm the unit belongs to the Platform & Assurance division. If it
   does not, mark it return-to-Nova (do not route it onward by guess).
3. `[script]` Pull the minimal assurance context for the account(s)/entity in scope —
   the signals that disambiguate which report (platform / service-quality / knowledge)
   owns it. Read-only; never write.
4. `[haiku]` Recall prior context for the thread via the retrieval tier; attach each
   item with its source reference. A miss is recorded as "no recall," never guessed.

## Outputs

`receipt.md` — the confirmed in-division unit (or a return-to-Nova flag), the carried
intent + constraints + authority, the account(s)/entity in scope, the disambiguating
assurance signals, and cited recall items (or "no recall").

## Audit

- [ ] The unit is confirmed in-division, or explicitly flagged return-to-Nova — never routed onward by guess
- [ ] Carried constraints (consent/deadline/authority) preserved from Nova's delegation
- [ ] Entity references carry ids; none re-invented (Nova resolved them)
- [ ] Every recall item carries a source reference; a miss is "no recall," not a guess
- [ ] Read-only — nothing written, no correction made, nothing actuated; assurance stays audit-only
