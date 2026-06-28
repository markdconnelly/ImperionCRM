# Stage 01 — match

**Job:** match an onsite-flagged ticket to the right technician.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Onsite ticket | silver `ticket` · `okf:ticket` | the flagged ticket + its work description | the subject + skill needed |
| Device requiring work | silver `device` · `okf:device` | the CI the onsite work targets | skill match |
| Account site | silver `account` · `okf:account` | the account's site/location | location match |

## Process

1. `[script]` Extract the onsite work requirement (skill needed, device, urgency)
   from the ticket and resolve the account's site location. Never write here.
2. `[sonnet]` Match a technician against the hard constraints in order — skill,
   then location proximity, then availability — and state one line on why this tech
   fits. No qualified+available match → a finding (escalate), not a forced slot.

## Outputs

`match.md` — the work requirement, the proposed technician + match rationale, or a
`no-match` finding. No assignment is written here.

## Audit

- [ ] Work requirement (skill + device + site) extracted
- [ ] A grounded technician match with rationale, OR a `no-match` finding raised
- [ ] No double-book or calendar override proposed
