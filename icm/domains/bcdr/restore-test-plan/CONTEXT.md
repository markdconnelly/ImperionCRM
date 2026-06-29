# Workflow: restore-test-plan (bcdr v1)

**Job:** for a protected asset (`device`/`cloud_asset`), assess its recovery
posture (last good backup, RPO/RTO expectations), design a recovery/restore TEST,
and PROPOSE a test plan (scope, steps, success criteria, rollback) plus a tracking
ticket — never actuating. The test execution is a human's call; this workflow only
plans it.

**Trigger:** a recovery-posture review is requested for a protected asset — a
periodic restore-readiness cycle, a continuity-review ask, or a follow-up from a
backup-verification gap (the complement to `backup-verification`). One run per
protected asset under review.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | assess-posture | Read last good backup + the account's RPO/RTO expectations | — |
| 02 | design-test | Design the restore TEST (scope, steps, success criteria, rollback) | — |
| 03 | propose-plan | Write the INTERNAL plan + tracking ticket; park execution | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 tracer runs at **L1**; Phoenix's ceiling is L3.
When flipped to `auto` it may self-approve ONLY writing the INTERNAL restore-test-plan
record and its tracking `ticket.note`. The restore test **execution** — and any
backup/restore trigger — is **always parked** for a human, in every mode, dial-proof
(CONSTITUTION §5.4). There is no restore actuation on the autonomous path; a
production restore is never this workflow's call.

## Runtime skills

None at v1 (`skills: []`). The RPO/RTO target catalogue and the restore-test runbook
templates arrive as workflow-local Tier-3 skills if/when this workflow grows them.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed workflow prose is `prose.md`.
