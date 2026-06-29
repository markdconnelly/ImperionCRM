# Stage 03 — propose-handoff

**Job:** track each offboarding item's status and propose the checklist + coordination
tasks to a human — parking anything that deprovisions, sends, or touches employment,
compensation, or PII. This is the checkpoint; the run never sends and never decides
employment terms.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Offboarding checklist | `offboarding-checklist.md` (stage 02 output) | all | the items to track |
| Item status | prior run state via `memory.recall` | cited captures | what is done / blocked |

> No OKF entity is grounded here — there are no `okf:` markers. Status is tracked by
> reference; no PII enters the artifact (ADR-0060).

## Process

1. `[script]` Mark each checklist item `done` / `in-progress` / `blocked` from the
   tracked state. A blocked deprovisioning or closeout item is surfaced, not retried
   here.
2. `[sonnet]` Summarize offboarding readiness in one short paragraph — what is
   complete, what is outstanding, what is the single next step.
3. `[script]` Park: every deprovisioning/send/employment/compensation/PII item is
   routed to the human queue; nothing in this workflow actuates one — the identity
   deprovisioning is Osiris's gated call. Salary is never stated.

## Outputs

`offboarding-status.md` — per-item status, the readiness summary, and the parked
human-only items. **This stage parks** — it proposes the checklist + the handoff to a
human (CONSTITUTION §5.4) and ends. No send, no deprovisioning, no employment
decision, in any mode.

## Audit

- [ ] Every checklist item has a status (`done` / `in-progress` / `blocked`)
- [ ] Readiness summary names the single next step
- [ ] All deprovisioning/send/employment/comp/PII items parked to the human queue; no salary disclosed

## Checkpoint

The human approves the proposed offboarding checklist and the coordination tasks
before any actuation. In `auto`, this workflow may self-approve ONLY the internal,
reversible, propose-only checklist + coordination-task draft for a standard
departure; every deprovisioning/provisioning change, every send, and every
employment/comp/PII item parks for a human in every mode (CONSTITUTION §5.4). Salary
is **never disclosed**, at any level.
