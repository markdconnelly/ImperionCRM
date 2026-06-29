# Stage 02 — design-test

**Job:** design the restore TEST — scope, ordered steps, success criteria, and
rollback — against the assessed posture. No restore is triggered here.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Posture record | stage 01 `posture.md` | all | last good backup + RPO/RTO context to design against |
| Protected device | silver `device` · `okf:device` | the under-review device | the restore source + sandbox target shape |
| Protected cloud asset | silver `cloud_asset` · `okf:cloud_asset` | the under-review cloud resource | the restore source + sandbox target shape |

## Process

1. `[script]` Set the test SCOPE: which backup point and which asset(s) the test would
   restore, drawn only from a good backup point identified in stage 01 (a stale/missing
   backup is carried as a gap, not designed around).
2. `[sonnet]` Design the ordered restore-test STEPS: restore to an **isolated
   sandbox**, validate data integrity, and observe recovery time vs the RTO target.
   Production is never a restore target; describing the steps does not run them.
3. `[sonnet]` Define the SUCCESS CRITERIA (what proves recoverability) and the
   ROLLBACK (how the sandbox is returned to clean state and torn down after the test).

## Outputs

`test-design.md` — the test scope, the ordered sandbox restore-test steps, the success
criteria, and the rollback. Sandbox-only; no production restore target and no trigger.

## Audit

- [ ] Scope draws only from a good backup point established in stage 01
- [ ] Steps are SANDBOX-only — no production restore target named, no restore triggered
- [ ] Success criteria AND rollback both defined
