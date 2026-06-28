# Stage 03 — report

**Job:** report the RPO/RTO evidence and escalate gaps — the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Verification record | stage 01 `verification.md` | all | success/failure/aging evidence |
| Test-restore record | stage 02 `test-restore.md` | all | recoverability evidence + RTO |
| Account protection profile | silver `account` · `okf:account` | the account's RPO/RTO targets | evidence vs target |

## Process

1. `[sonnet]` Assemble the RPO/RTO evidence: last good restore, observed recovery
   time vs RTO target, backup age vs RPO target, and the recoverability proof
   (passed test-restore) or its absence.
2. `[sonnet]` Escalate gaps: failed backups, RPO-aging, and failed/unproven
   test-restores route to the human queue (a recurring fault also to Sage for root
   cause).
3. `[script]` If a production restore is warranted, describe it and **PARK** it —
   the production restore always parks for a human, dial-proof, at every rung. The
   v1 tracer never executes a restore.

## Outputs

`report.md` — the RPO/RTO evidence record, the escalated gaps, and any parked
production-restore recommendation with the decision a human must make. The run ENDS
here; no restore is executed and nothing is sent.

## Audit

- [ ] RPO/RTO evidence present (last good restore + observed RTO + age vs targets)
- [ ] Failures/aging/unproven restores escalated to the human queue
- [ ] Any production restore PARKED — never executed at any rung
- [ ] No send and no production restore occurred — the run ended at the checkpoint
