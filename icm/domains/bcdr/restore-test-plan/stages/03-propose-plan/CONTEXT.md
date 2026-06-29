# Stage 03 — propose-plan

**Job:** write the INTERNAL restore-test-plan record + a tracking ticket, and PARK the
test execution — the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Posture record | stage 01 `posture.md` | all | the recovery posture + any gap |
| Test design | stage 02 `test-design.md` | all | scope, steps, success criteria, rollback |
| Account protection profile | silver `account` · `okf:account` | the account's RPO/RTO targets | frame the plan + the human decision against the target |

## Process

1. `[sonnet]` Assemble the restore-test PLAN: the posture (last good backup, age vs
   RPO, RTO expectation), the test design (scope, steps, success criteria, rollback),
   and any posture gap that motivates running it.
2. `[script]` Write the INTERNAL restore-test-plan record and a tracking `ticket.note`
   (operational, never client-facing) capturing the plan and the decision a human must
   make to schedule the test. This internal note is the only write.
3. `[script]` PARK the restore test **execution** — and any backup/restore trigger —
   for a human. The execution always parks, dial-proof, at every rung; the v1 tracer
   never actuates a restore. A recurring/structural recovery gap also routes to Sage
   for root cause.

## Outputs

`plan.md` — the restore-test plan (posture + design + gap), the tracking ticket
reference, and the parked execution with the decision a human must make. The run ENDS
here; no restore is executed and nothing is sent.

## Audit

- [ ] Plan contains posture, test design (scope/steps/success criteria/rollback), and any gap
- [ ] Only write is the INTERNAL restore-test-plan record + tracking `ticket.note`
- [ ] Restore test EXECUTION and any backup/restore trigger PARKED — never actuated at any rung
- [ ] No send and no restore occurred — the run ended at the checkpoint

## Checkpoint

A human approves the restore-test plan and decides whether/when to schedule the test
execution. In `auto` mode at **L1**, the worker may self-approve ONLY writing the
INTERNAL restore-test-plan record and its tracking `ticket.note`; the restore test
**execution** and any backup/restore trigger always park for a human, dial-proof, at
every rung. Anything not named here parks by default.
