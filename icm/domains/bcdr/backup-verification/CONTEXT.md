# Workflow: backup-verification (bcdr v1)

**Job:** every backup cycle is verified for success, a sample is proven restorable
via a sandbox test-restore, failures and aging backups are flagged, and the
RPO/RTO evidence is reported. A production restore is never this workflow's call.

**Trigger:** a scheduled verification cycle fires, or a backup-job event lands
(success/failure from the Datto BCDR posture feed, #683). One run per backup
scope/cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | verify | Confirm backup-job success + flag failures/aging | — |
| 02 | test-restore | Prove recoverability via a SANDBOX test-restore | — |
| 03 | report | Report RPO/RTO evidence; escalate gaps | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 tracer runs at **L1**; Phoenix's ceiling is L3.
When flipped to `auto` it may self-approve ONLY writing the internal verification
finding for a confirmed-successful job. The sandbox test-restore is an L3-ceiling
action (gated below that rung); a **production restore always parks** for a human,
in every mode — dial-proof (CONSTITUTION §5.4).

## Runtime skills

None at v1 (`skills: []`). The RPO/RTO target catalogue and the sandbox
test-restore runbook arrive as workflow-local Tier-3 skills when the L3
test-restore rung is dialled on. Rules of the format: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
