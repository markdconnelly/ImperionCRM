# Stage 01 — intake-confirm

**Job:** turn an accepted-offer event into one confirmed onboarding intake with the
role context assembled — by reference, with no PII and no compensation read in.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Accepted-offer event | the triggering lifecycle row (handed down by Rachel) | role, start date, manager, team — references only | the subject |
| Onboarding playbook | prior onboarding context via `memory.recall` | cited captures | the standard sequence |
| Org context | `knowledge.search` (gold, cited) | role/team norms | shape the plan |

> No OKF entity is grounded here (the people domain has none) — there are no
> `okf:` markers. No compensation or personal data is read into the run (ADR-0060);
> reference the new hire by id/role only.

## Process

1. `[script]` Confirm the offer is in the accepted state from the lifecycle event.
   Not accepted → audit fail (this workflow runs only post-acceptance).
2. `[script]` Extract the role context (role, start date, manager, team) by
   reference. Any compensation or personal-data field present in the payload is
   **left unread** and noted as "human-only".
3. `[sonnet]` State what is known and what is not yet known for onboarding (e.g.
   missing start date, unconfirmed manager), in one short paragraph.

## Outputs

`intake.md` — accepted-offer confirmation, role context (by reference), and the
known/unknown summary. No compensation, no personal data.

## Audit

- [ ] Offer state confirmed as accepted (else parked)
- [ ] Role context captured by reference only — no compensation, no PII present
- [ ] Known/unknown summary present (a blank summary is not valid)
