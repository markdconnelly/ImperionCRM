# Stage 01 — gather-context

**Job:** turn a confirmed-departure event into one offboarding context with the role,
access, and asset footprint assembled — by reference, with no PII and no compensation
read in.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Confirmed-departure event | the triggering lifecycle row (handed down by Rachel) | role, last day, manager, team — references only | the subject |
| Onboarding record | the new hire's prior onboarding run via `memory.recall` | cited captures | the inverse map of what was stood up (access/assets to return) |
| Offboarding playbook | prior offboarding context via `memory.recall` | cited captures | the standard sequence |
| Org context | `knowledge.search` (gold, cited) | role/team norms | shape the checklist |

> No OKF entity is grounded here (the people domain has none) — there are no
> `okf:` markers. No compensation or personal data is read into the run (ADR-0060);
> reference the departing employee by id/role only.

## Process

1. `[script]` Confirm the departure is in the confirmed state from the lifecycle
   event. Not confirmed → audit fail (this workflow runs only post-confirmation).
2. `[script]` Extract the role context (role, last day, manager, team) and the open
   access/asset footprint by reference, reading the **onboarding record** as the
   inverse map of what was provisioned. Any compensation or personal-data field
   present in the payload is **left unread** and noted as "human-only".
3. `[sonnet]` State what is known and what is not yet known for offboarding (e.g.
   missing last day, unconfirmed asset inventory), in one short paragraph.

## Outputs

`offboarding-context.md` — departure confirmation, role/access/asset context (by
reference), and the known/unknown summary. No compensation, no personal data.

## Audit

- [ ] Departure state confirmed (else parked)
- [ ] Role + access/asset footprint captured by reference only — no compensation, no PII present
- [ ] Known/unknown summary present (a blank summary is not valid)
