# Stage 04 — troubleshoot

**Job:** run the chosen path's basic, read-only diagnostic steps and form a leading
hypothesis.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Triage decision | stage 03 `triage-decision.md` | path, escalate-only | which step-set, or skip |
| Asset status | stage 02 `asset-status.md` | all | the inputs the checks read |
| Path runbook | `../../skills/troubleshooting-paths.md`* | the chosen path's step-set | the diagnostic checklist |
| Device / cloud re-read | silver `device` / `cloud_asset` · `okf:device` `okf:cloud_asset` | the affected asset | re-read for the diagnostic checks |

\* workflow-local skill (Tier 3); cited by the manifest.

## Process

1. `[script]` If `escalate-only`, skip the step-set and record `escalated — no steps
   run`; go to Outputs.
2. `[sonnet]` Execute the path's basic diagnostic steps — **read-only in v1**:
   inspect the asset's status, posture, and known state against the runbook's
   checklist and reason about likely cause. No remediation, no external command
   (remediation is a later, separately-gated Service workflow).
3. `[sonnet]` Record findings per step: checked / result / what it implies.
4. `[sonnet]` Form a leading root-cause hypothesis with a confidence note; flag if
   the symptom looks like a recurring root cause masked by prior quick fixes
   (Felix's guardrail).

## Outputs

`troubleshooting-log.md` — per-step findings · leading hypothesis + confidence ·
recurring-root-cause flag · or `escalated — no steps run`.

## Audit

- [ ] Every step in the chosen path's step-set is marked checked or `n/a` with a reason (or `escalate-only` recorded)
- [ ] Findings are read-only — no remediation or external action recorded
- [ ] A leading hypothesis is stated with a confidence note
