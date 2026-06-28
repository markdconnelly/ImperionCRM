# Stage 02 — propose-schedule

**Job:** draft the schedule and park the customer-facing confirmation — the
checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Match record | stage 01 `match.md` | all | the technician + work to schedule |
| Onsite ticket | silver `ticket` · `okf:ticket` | the flagged ticket | where the assignment lands |
| Account site | silver `account` · `okf:account` | the account's site + contact context | the confirmation's audience |

## Process

1. `[sonnet]` Draft the proposed schedule (window + technician) against the matched
   technician's availability. A conflict is a finding, not a forced slot.
2. `[sonnet]` Draft the internal assignment work-note and the customer-facing
   schedule confirmation (a draft only).
3. `[script]` PARK the customer-facing confirmation for a human — dial-proof at
   every rung. Autotask remains the scheduling system of record; the v1 tracer does
   not write to it or send.

## Outputs

`schedule.md` — the proposed window + technician, the internal assignment draft,
the parked customer confirmation, and the exact send a human must approve. The run
ENDS here; nothing is committed to a customer or sent.

## Audit

- [ ] Proposed window present and conflict-free (or conflict raised as a finding)
- [ ] Customer-facing confirmation is a DRAFT and PARKED — no self-confirm at any rung
- [ ] No send and no customer commitment occurred — the run ended at the checkpoint
