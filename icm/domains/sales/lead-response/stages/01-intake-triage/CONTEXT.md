# Stage 01 — intake-triage

**Job:** turn a raw lead event into one classified, deduplicated triage record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Lead event | the triggering row (Meta lead bronze / website form / DM interaction / Apollo entry) | full payload | the subject |
| Existing contacts/accounts | silver `contact` / `account` | match candidates by email/phone/company | dedupe |
| ICP | `../../skills/icp.md` | all | fit scoring |
| Consent | consent ledger | this contact's entries | response lawfulness |

## Process

1. `[script]` Extract identity fields (name, email, phone, company, source,
   message text) from the payload's known keys. Missing email AND phone on a
   non-DM lead → audit fail.
2. `[script]` Dedupe: match against silver contacts by email/phone/company.
   Existing contact → link; else mark `new`. Never create silver rows here
   (executor owns writes).
3. `[sonnet]` Classify intent: `standard-inquiry` | `pricing-contract` |
   `support-misroute` | `complaint` | `spam`. Score ICP fit 1–5 per
   `icp.md`, one sentence of reasoning.
4. `[script]` Record consent basis found (or `none`) from the ledger lookup.

## Outputs

`triage.md` — identity, source, dedupe result, intent class, fit score +
reasoning, consent basis. `spam` ends the run; `support-misroute` ends it with
a service-desk handoff note.

## Audit

- [ ] Exactly one intent class and one fit score present
- [ ] Dedupe decision states the matched contact id or `new`
- [ ] Consent basis stated (`none` is valid; blank is not)
