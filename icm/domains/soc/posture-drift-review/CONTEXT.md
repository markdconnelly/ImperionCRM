# Workflow: posture-drift-review (soc v1)

**Job:** a periodic read of each client's `posture_snapshot` plus `device`/`cloud_asset`
health against the expected baseline, detecting security-posture drift/degradation and
proposing investigations or hardening for a human — never actuating.

**Trigger:** a scheduled cadence (the periodic posture sweep, not a live detection). One
run per client posture review.

**Handoff identity:** the SOC has no actuation path at v1; every proposed investigation
and every hardening recommendation hands off to Roman (Deputy CISO) for execution.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | read-posture | Read the current posture_snapshot + device/cloud_asset health for the client | — |
| 02 | detect-drift | Compare against the expected baseline; classify drift/degradation | — |
| 03 | propose | Propose investigations/hardening; park for Roman | **Yes** |

## Autonomy

Default rung **L1** (ADR-0061). Cyrus's persona ceiling is **L4** (high-confidence
reversible containment under an IR runbook + undo window), but this workflow does not
actuate at all: it is a read-and-propose review. Stage 03 drafts proposals and parks
for Roman. When flipped to `auto`, it may self-approve ONLY recording the internal
drift-finding for a review with an audit-clean evidence chain. **Every proposed
investigation, every hardening recommendation, and any identity/destructive/client-facing
effect always park** — in every mode (CONSTITUTION §5.4). No containment, no write.

## Runtime skills

None at v1 (the baseline rubric + hardening catalogue land as Tier-3 skills when the
actuation path does, #1556). Stages cite the posture facts they ground on via their
Inputs table, never restate them. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
