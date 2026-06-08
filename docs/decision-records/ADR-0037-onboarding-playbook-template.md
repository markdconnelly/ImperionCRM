# ADR-0037: Standard onboarding playbook template & checklist

- **Status:** Accepted
- **Date:** 2026-06-08

## Problem
Project managers need a repeatable onboarding process, not free-form projects. The
business has a defined 9-phase MSP onboarding playbook (~90 steps — Autotask/IT Glue
setup, discovery, network takeover, M365 hardening, endpoint deployment, validation,
handoff, closeout). Each new client onboarding should instantiate this playbook, show a
red/yellow/green indicator per major step, and let PMs check steps off — with the R/Y/G
reflecting actual completion.

## Context
ADR-0034 created the delivery `project`, the R/Y/G `project_milestone`, and task
categories, with milestone health manual and auto-completion deferred. ADR-0020 framed
`project` as the delivery spine with "milestones … in later migrations." This is that
follow-on: a reusable template plus per-project instantiation and a checklist that
*derives* phase health.

## Options considered
1. Encode the playbook as a versioned **code constant** and instantiate it into
   `project_milestone` (phases) + a dedicated `onboarding_step` checklist; derive phase
   R/Y/G from step completion (this decision).
2. Store the template in DB catalog tables (like `question_template`) (rejected for now —
   the playbook is a single standard, not per-client; a constant is simpler to version in
   git and review, and the 9.6/9.7 retrospective steps already drive its evolution).
3. Make each of the ~90 steps a `task` row (rejected — pollutes the global task list with
   thousands of rows; ad-hoc PM work still uses `task`, the structured checklist does not).

## Tradeoffs
- (1) one source of truth in `lib/onboarding-template.ts`; clean separation between the
  structured checklist (`onboarding_step`) and ad-hoc PM tasks (`task`); phase health is
  honest (derived from checked steps). Cost: editing the playbook is a code change, not a
  GUI edit (acceptable — it is a standard, changed deliberately).
- (2)/(3) either over-build the catalog now or degrade the task list.

## Decision
- **`lib/onboarding-template.ts`** — the `ONBOARDING_TEMPLATE` constant: 9 phases, each
  with `offsetDays`/`durationDays` (phases overlap, per the source schedule) and an
  ordered list of steps (`code`, `title`, `send` for client communications).
- Migration **`0034`** adds `project_milestone.start_at` and the `onboarding_step` table
  (`project_id`, `milestone_id`, `code`, `title`, `is_comm`, `ordinal`, `status`,
  `due_at`, `completed_at`; `UNIQUE(project_id, code)`).
- **`applyOnboardingTemplate(projectId, startAt)`** instantiates the playbook: each phase
  → a `project_milestone` with `start_at`/`due_at` computed from `startAt` + offsets; each
  step → an `onboarding_step` linked to that milestone. Idempotent (skips if already
  applied).
- **Derived health** (`listOnboarding`): a phase is green when all steps are done, red when
  past `due_at` with steps open, amber otherwise; phases with no checklist fall back to the
  stored (manual) health. **`setOnboardingStepStatus`** toggles a step and the R/Y/G
  re-derives — the in-app automation of "what steps have been completed."
- **UI:** the Onboarding dashboard renders each phase as an expandable checklist with the
  derived R/Y/G and a done/total counter; an **Apply standard onboarding playbook** button
  (with a start date) instantiates it; a read-only **/onboarding/playbook** viewer shows the
  standard.

## Security impact
None new — account/project-scoped like the rest of delivery (ADR-0016). The checklist
contains operational steps, not secrets; credentials referenced by steps live in IT
Glue/Key Vault, never here.

## Cost impact
Negligible — one column, one table, ~90 rows per onboarding.

## Operational impact
Migration `0034`. The playbook evolves in code (retrospective steps 9.6/9.7). True
auto-completion from observed system state (Datto/Intune/Defender/IT Glue signals) remains
a back-end concern (`auto_check_key`, tracked in the back-end requirements doc); today
completion is the PM checking the box.

## Future considerations
Per-step owner/assignment and due dates; promote a step to a `task`; multiple named
playbooks (implementation vs onboarding) in DB catalog tables if per-client variants
emerge; auto-check integrations to flip steps from system state.
