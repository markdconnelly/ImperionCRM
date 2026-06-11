# ADR-0034: Onboarding project-management dashboard, R/Y/G milestones & task categories

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-08 |
| **Cross-references** | — |

## Problem

Autotask's project management is weak, so project managers need this app to run client
onboarding: a per-client view of progress toward onboarding steps with a clear
red/yellow/green indicator for each major step, and tasks that serve both the sales
pipeline and project delivery.

## Context

A delivery `project` (onboarding|implementation, status not_started→complete) exists
(ADR-0020) and a single general `task` object serves sales and delivery (ADR-0010). The
project was described as the delivery spine with "milestones … in later migrations" —
this is that migration.

## Options considered

1. Add `project_milestone` rows (major steps) each with status + R/Y/G health, render
   an onboarding dashboard, and categorize the shared `task` object
   (this decision).
2. A separate project-management subsystem / new task model (rejected — duplicates the
   existing `task`; two to-do systems).
3. Derive health purely from `project.status` (rejected — too coarse; the ask is R/Y/G
   per major step, not per project).

### Tradeoffs

- (1) reuses the task object; milestones give step-level R/Y/G and an overall rollup;
  one dashboard. Cost: a new table and (later) an automation to flip health from
  observed state.
- (2)/(3) simpler but miss the requirement or fork the model.

## Decision

- Migration **`0029`** adds `task.category`
  (`sales|project|onboarding|general`) so the one task object is filterable per use.
- Migration **`0030`** adds `project_milestone` (name, ordinal, status, R/Y/G
  `health`, `auto_check_key`, due/completed). The **auto-completion check** that flips
  health from observed system state is deferred to the back-end; health is manual now
  (click a dot to cycle).
- **Onboarding** becomes a PM dashboard: per-client cards with a R/Y/G indicator per
  milestone + overall rollup (worst-of), a project-tasks board (tasks where category ∈
  {project, onboarding}), and the project list. **Tasks** gain a category badge +
  filter; the **task form** gains a category select. Repos add `listOnboarding` and
  `setMilestoneHealth`.

## Consequences

### Security impact

None new — same account-scoped access (ADR-0016). The milestone health control is a
benign status toggle.

### Cost impact

Negligible — one column, one table, one index.

### Operational impact

Migrations `0029`/`0030`. Standard onboarding milestone templates and the
auto-completion rules engine (observing tenant/system state) are back-end work tracked
in `docs/integrations/frontend-driven-backend-requirements.md`.

## Future considerations

Milestone templates per onboarding playbook; auto-completion from Graph/Autotask/IT
Glue signals; SLA/aging and overdue surfacing; promote a milestone to tasks.
