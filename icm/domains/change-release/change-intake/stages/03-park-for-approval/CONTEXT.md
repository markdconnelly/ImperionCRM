# Stage 03 — park-for-approval

**Job:** assemble the change record and park it for a human to approve — the
checkpoint. Approval and execution are never the workflow's to make.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Risk record | stage 01 `risk.md` | all | the score + scope for the record |
| Plan record | stage 02 `plan.md` | all | window + rollback + comms for the record |
| Change request | silver `ticket` · `okf:ticket` | the change request to attach the record to | where the change record lands |

## Process

1. `[sonnet]` Assemble the change record: risk score, schedule, rollback plan,
   comms draft, affected CIs/account — a decision-ready package.
2. `[script]` PARK for human approval. The approval and the execution always park,
   at every rung — dial-proof. The workflow never flips its own approval.
3. `[script]` On (human) approval — out of scope for this workflow — the change
   routes to its owner (Felix/Ozzie) and the comms send exits via ADR-0058. The
   v1 tracer does NONE of this; it ends at the park.

## Outputs

`change-record.md` — the assembled, decision-ready change record and its parked
state, with the exact approval decision a human must make. The run ENDS here;
nothing is approved, sent, or executed.

## Audit

- [ ] Change record assembled (score + schedule + rollback + comms + scope)
- [ ] Record PARKED for human approval — no self-approval at any rung
- [ ] No send and no execution occurred — the run ended at the checkpoint
