# Stage 01 — verify

**Job:** confirm backup-job success across the in-scope estate and flag
failures/aging.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Backup event/cycle | the triggering row (scheduled cycle or backup-job event) | full payload | the subject + scope |
| Protected devices | silver `device` · `okf:device` | in-scope device(s) + their Datto BCDR backup-posture fields | success + aging check |
| Protected cloud assets | silver `cloud_asset` · `okf:cloud_asset` | in-scope cloud resource(s) under backup | success + aging check |
| Account protection profile | silver `account` · `okf:account` | the account's RPO/RTO targets | aging/posture thresholds |

## Process

1. `[script]` Enumerate the in-scope protected `device`/`cloud_asset` and read each
   one's last backup status + timestamp. Never write here.
2. `[script]` Flag any failed job, and any backup whose age exceeds the account's
   RPO target.
3. `[sonnet]` Summarize the verification posture: counts of success/failed/aging
   and the at-risk CIs, with one line of grounded reasoning.

## Outputs

`verification.md` — per-CI backup status + age, the failed/aging flags against RPO,
and the posture summary. Failures/aging carry through to the report stage.

## Audit

- [ ] Every in-scope CI's last backup status + timestamp recorded
- [ ] Failures and RPO-aging explicitly flagged (or `none`)
- [ ] Posture summary present
