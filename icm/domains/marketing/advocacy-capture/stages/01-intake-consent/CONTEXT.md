# Stage 01 — intake-consent

**Job:** ingest the consented candidate handed from Celeste and verify a recorded
consent_event with a scope of use exists — the hard precondition for advocacy.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Consented candidate | Celeste hand-over | this candidate | the existing customer Celeste flagged as having agreed to be referenced |
| Recorded consent | `` `okf:consent_event` `` | this candidate | the recorded consent + its scope of use (the hard precondition) |
| Account | `` `okf:account` `` | this candidate's account | the customer the reference attributes to |
| Contact | `` `okf:contact` `` | this candidate's contact | the consenting person of record |

## Process

1. `[script]` Ingest the candidate Celeste handed over (account id, contact id,
   the referenced material). **Belle does NOT contact the client** — this stage
   only reads an already-consented hand-over (BO-04 refusal floor). There is no
   solicitation step here and no client-contact tool.
2. `[haiku]` Verify a **recorded `consent_event`** exists for this candidate and
   read its **scope of use** (what may be attributed / quoted / shown).
3. `[script]` **No recorded consent_event → PARK** (the hard precondition, D4).
   Do not infer, assume, or manufacture consent; do not reach out to obtain it.

## Outputs

`intake-consent.md` — the candidate (account id, contact id) + the recorded
consent_event reference and its scope of use; the precondition result (consent
present / parked). Reference data by id, no PII.

## Audit

- [ ] A recorded `consent_event` with a scope of use is present for this candidate
      (else the run is **parked** — the D4 hard precondition)
- [ ] The candidate arrived via the Celeste hand-over; no client-contact step was
      taken (BO-04 refusal floor)
- [ ] The account + contact are resolved by id (no PII captured)
