# ADR-0070: PM templates, recurring tasks, and form intake

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0034/0037 (onboarding playbook), ADR-0042 (GUI/process split), ADR-0053 (events / `registration_page` form), ADR-0061 (ICM automation), `docs/product/pm-feature-requirements.md` Theme E |

## Problem

The onboarding playbook is hard-coded — there is no user-editable project/task
template. Tasks cannot recur. There is no form intake that creates a task/project.

## Context

The playbook already instantiates phases→milestones→steps per project (ADR-0037);
generalising it to user-defined templates is a natural extension. Recurrence
*generation* is a process → backend (ADR-0042). Events already ship a JSON form
config (`event.registration_page`, ADR-0053) that intake can reuse. No-code rule
automation is explicitly out of scope (separate feature request); recurrence here is
a scheduled materialiser, not a rules engine.

## Options considered

1. **Generalise the playbook into a `project_template` model** + a backend recurrence
   job + reuse the event-form pattern for intake — maximal reuse of existing pieces.
2. **Keep templates hard-coded, add only recurrence** — rejected: leaves the biggest
   template gap (admins can't define new delivery playbooks) unaddressed.

### Tradeoffs

Template-apply must be a **snapshot** (later template edits must not retro-mutate live
projects) — chosen for predictability over live-link convenience. Recurrence in the
backend adds a scheduled job but is the only correct home for a process (ADR-0042).

## Decision

- **Editable templates (E1, v2)** — `project_template{ id, name, project_type_id,
  is_protected }` + `template_item{ template_id, kind: milestone|step|task, parent_ref,
  ordinal, payload jsonb }`. Applying a template **snapshots** items onto the new
  project; later edits don't retro-mutate live projects. Task checklist templates
  apply a set of subtasks (ADR-0065 B1) to a task. The existing onboarding playbook
  becomes the **seeded, protected default** template — no behaviour change for current
  onboarding.
- **Recurring tasks (E2, v1-should)** — `task_recurrence{ task_id, rule(RRULE),
  next_run_at, ends_at, count_remaining }`. The GUI defines the recurrence; the
  **backend** scheduled job materialises the next occurrence on completion/schedule
  (NFR-4). Edit-this vs. edit-series semantics; end by date or count.
- **Form intake (E3, v2)** — internal intake forms reusing the `event.registration_page`
  JSON-form pattern; submit maps fields → a task/project (title, assignee, project,
  custom fields) and routes to a default project/queue. **Staff-authenticated only in
  v1**; external/public intake is a later, separately-scoped decision (it borders on
  the excluded public-API surface). **Editing is in-place** (#639): a form's definition
  is patched on the existing `intake_form` row, so its id and stable `key` — and the
  prior submissions joined on `intake_submission.form_id` — survive an edit. The
  `is_active` flag is author-controlled (an inactive form stops accepting submissions
  without being deleted). The builder reuses the same `payload` JSON contract for both
  create and edit.

## Consequences

- Admins can define reusable delivery playbooks instead of relying on the one
  hard-coded onboarding flow; recurrence and intake reduce manual task creation.
- A new backend scheduled job (recurrence materialiser) joins the ADR-0064
  notification scheduler in `ImperionCRM_Backend`.

### Security impact

Templates and intake forms are admin-permissioned (NFR-1). Intake that creates work
from form input must validate/sanitise input (OWASP, §5) and stay staff-authenticated
in v1 to avoid an unauthenticated write surface. Recurrence job runs under a
service identity, audited (NFR-2).

### Cost impact

One additional backend timer-trigger (recurrence); negligible storage.

### Operational impact

Recurrence generation must be idempotent and survive missed runs (catch-up policy);
templates need a migration to seed the playbook as the protected default without
disturbing live onboarding projects.

## Future considerations

Template versioning/changelog; cloning a live project as a template; public/customer
intake forms (pending a decision on the external surface); recurrence exceptions
(skip/holiday calendars).
