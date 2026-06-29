# Stage 01 — assess-posture

**Job:** read the protected asset's last good backup and the account's RPO/RTO
expectations to establish the recovery posture the test plan is shaped against.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Posture-review request | the triggering row (review cycle / continuity ask / verification-gap follow-up) | full payload | the subject asset + why now |
| Protected device | silver `device` · `okf:device` | the under-review device + its Datto BCDR backup-posture fields | last good backup status + timestamp |
| Protected cloud asset | silver `cloud_asset` · `okf:cloud_asset` | the under-review cloud resource under backup | last good backup status + timestamp |
| Account protection profile | silver `account` · `okf:account` | the account's RPO/RTO targets | the recovery expectations to plan against |

## Process

1. `[script]` Read the under-review `device`/`cloud_asset` and record its last good
   backup status + timestamp and the backup chain it would restore from. Never write
   here.
2. `[script]` Read the account's RPO/RTO targets and compute backup age vs the RPO
   target.
3. `[sonnet]` Summarize the recovery posture: last good backup, age vs RPO, the RTO
   expectation, and any gap (stale/missing backup) that the test plan must surface —
   with one line of grounded reasoning.

## Outputs

`posture.md` — the asset's last good backup (status + timestamp), backup age vs the
RPO target, the RTO expectation, and any posture gap. Carries through to the test
design.

## Audit

- [ ] Last good backup status + timestamp recorded for the under-review asset
- [ ] Backup age stated against the account's RPO target
- [ ] RTO expectation recorded; any stale/missing-backup gap explicitly flagged (or `none`)
