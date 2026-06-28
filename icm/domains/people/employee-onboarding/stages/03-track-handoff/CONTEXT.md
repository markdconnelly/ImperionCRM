# Stage 03 — track-handoff

**Job:** track each onboarding step's status and hand off the plan — parking
anything that touches employment, compensation, or PII. This is the checkpoint; the
run never sends and never decides employment terms.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Onboarding plan | `onboarding-plan.md` (stage 02 output) | all | the steps to track |
| Step status | prior run state via `memory.recall` | cited captures | what is done / blocked |

> No OKF entity is grounded here — there are no `okf:` markers. Status is tracked by
> reference; no PII enters the artifact (ADR-0060).

## Process

1. `[script]` Mark each plan step `done` / `in-progress` / `blocked` from the
   tracked state. A blocked provisioning or IT step is surfaced, not retried here.
2. `[sonnet]` Summarize onboarding readiness in one short paragraph — what is
   complete, what is outstanding, what is the single next step.
3. `[script]` Park: every employment/compensation/PII step is routed to the human
   queue; nothing in this workflow actuates one. Salary is never stated.

## Outputs

`onboarding-status.md` — per-step status, the readiness summary, and the parked
human-only items. **This stage parks** — it presents the status + the handoff to a
human (CONSTITUTION §5.4) and ends. No send, no employment decision, in any mode.

## Audit

- [ ] Every plan step has a status (`done` / `in-progress` / `blocked`)
- [ ] Readiness summary names the single next step
- [ ] All employment/comp/PII items parked to the human queue; no salary disclosed
