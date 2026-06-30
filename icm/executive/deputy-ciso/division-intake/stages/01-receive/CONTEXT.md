# Stage 01 — receive

**Job:** take Nova's delegated unit and confirm it belongs to this division, then
ground the minimal security context needed to pick a report.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Delegated unit | the `delegate` from Nova's `intake-route` | the intent + carried constraints + resolved entities + asking-human authority | what to route |
| Accounts | silver `account` · `okf:account` | the account(s) the unit concerns | who the unit is about |
| Devices | silver `device` · `okf:device` | the device(s)/endpoints tied to the account | is this a SOC/endpoint or identity-on-device matter |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this thread's history | recall, always cited by reference |

## Process

1. `[script]` Read Nova's delegated unit: the intent, the carried constraints
   (consent/deadline/authority), and the already-resolved entities. Nova did the
   entity resolution — do not re-resolve.
2. `[sonnet]` Confirm the unit belongs to the Security & Compliance division. If it
   does not, mark it return-to-Nova (do not route it onward by guess).
3. `[script]` Pull the minimal security context for the account(s)/device(s) in
   scope — the signals that disambiguate which report owns it (a threat/endpoint
   signal vs a control-evidence/audit matter vs an access/identity matter).
   Read-only; never write, never actuate.
4. `[haiku]` Recall prior context for the thread via the retrieval tier; attach each
   item by source reference. A miss is recorded as "no recall," never guessed. Never
   reproduce client PII or secrets to ground (CS-08, CS-14 §5).

## Outputs

`receipt.md` — the confirmed in-division unit (or a return-to-Nova flag), the
carried intent + constraints + authority, the account(s)/device(s) in scope, the
disambiguating security signals (by reference), and cited recall items (or "no
recall").

## Audit

- [ ] The unit is confirmed in-division, or explicitly flagged return-to-Nova — never routed onward by guess
- [ ] Carried constraints (consent/deadline/authority) preserved from Nova's delegation
- [ ] Entity references carry ids; none re-invented (Nova resolved them)
- [ ] Every recall item carries a source reference; a miss is "no recall," not a guess
- [ ] Read-only — no record written, nothing actuated; no client PII or secret reproduced (pool-never-bleed: one client's signal never surfaced to another)
