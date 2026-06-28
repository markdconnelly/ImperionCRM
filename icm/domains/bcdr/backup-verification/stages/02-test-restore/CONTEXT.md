# Stage 02 — test-restore

**Job:** prove recoverability by restoring a sample into the SANDBOX. Production is
never touched.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Verification record | stage 01 `verification.md` | all | which CIs to sample |
| Protected devices | silver `device` · `okf:device` | the sampled device(s) | the restore source + target shape |
| Protected cloud assets | silver `cloud_asset` · `okf:cloud_asset` | the sampled cloud resource(s) | the restore source + target shape |

## Process

1. `[script]` Select a representative sample of the successfully-backed-up CIs to
   test-restore (failed jobs cannot be test-restored — they are already flagged).
2. `[sonnet]` Describe the **sandbox** test-restore plan: restore the sample to an
   isolated sandbox, validate integrity, measure the observed recovery time. This is
   the L3-ceiling action — gated below that rung and PARKED in the v1 tracer; never
   run against production.
3. `[script]` Record the test-restore result (passed/failed/parked) and the
   observed recovery time where available. A success status without a passing
   test-restore is recorded as `unproven`.

## Outputs

`test-restore.md` — the sampled CIs, the sandbox test-restore plan + result
(passed/failed/parked/unproven), and the observed recovery time. Production is never
a restore target here.

## Audit

- [ ] Sample drawn only from successfully-backed-up CIs
- [ ] Test-restore is SANDBOX-only — no production restore target named
- [ ] Result recorded; a green status without a passing test-restore is `unproven`
