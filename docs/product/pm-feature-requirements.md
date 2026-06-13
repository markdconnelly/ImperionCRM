# Project Management Feature Requirements

> Status: Draft for review · Owner: Mark · Created: 2026-06-12
> Source: gap analysis of Imperion PM surface vs. Asana / Monday / Jira / ClickUp / Smartsheet.
> This document specifies the requirements to close the PM feature gaps. It is a
> requirements set, not an implementation plan — each theme becomes an ADR + epic
> + micro-PR slices per the §3 change workflow before build.

## 1. Purpose & scope

Bring Imperion's delivery/onboarding and task surfaces to parity with mainstream
PM tools on the features employees will expect at go-live, **without** turning the
CRM into a general-purpose PM SaaS. Requirements target the existing object model
(`task`, `project`, `project_milestone`, `onboarding_step`) and reuse the
CRM↔delivery linkage (opportunity → project → task) rather than bolting on a
parallel system.

### Explicitly out of scope (excluded by request)

- **No-code task automation / rules engine** (if field=X → assign/create/move).
  Tracked as its own future feature request, not part of this set.
- **Public API / webhooks / third-party app marketplace.** Internal use only.

### Non-goals (intentional, to bound scope)

- Replacing the CRM data model with a generic "everything is an item" board.
- Cross-tenant/client-facing PM portals (this is internal staff tooling).
- Enterprise agile at scale (multi-team program boards beyond a single backlog).

## 2. Cross-cutting (non-functional) requirements

These apply to **every** feature below.

- **NFR-1 RBAC.** All new objects respect existing role gates. Editing others'
  tasks, deleting comments, and managing templates are permissioned actions.
- **NFR-2 Audit.** Every mutating action writes to `audit_log` with actor, object,
  before/after. Comments/status/assignment changes are audit-visible.
- **NFR-3 PII / security baseline.** Conforms to
  `docs/security/unified-security-standard.md`. Attachments and comments may carry
  client PII → storage is access-controlled, never logged in plaintext, never
  copied into issues/PRs. **Never commit secrets.**
- **NFR-4 Schema ownership.** All migrations land in `ImperionCRM` (single source
  of truth, §1). Any process (notification dispatch, recurrence generation) is a
  **backend** capability, invoked by the GUI, never run in the front end.
- **NFR-5 Performance.** Board/list/calendar views render ≤ 200 visible items
  without blocking; pagination/virtualization beyond that. Activity feeds are
  paginated.
- **NFR-6 Blast radius.** Schema touches `task`/`project` (shared modules) → run
  `graphify affected` and record impacted files in each PR's Testing section (§7).

## 3. Prioritisation

MoSCoW + suggested phase against the v1 "Complete" / v2 "Refined" recut (ADR-0057).

| Phase | Theme | Rationale |
|---|---|---|
| **v1 (Must)** | A Collaboration (comments, mentions, notifications, attachments); C1 Kanban board | Highest perceived gap for staff at first touch |
| **v1 (Should)** | B1 Subtasks, B3 Multi-assignee/watchers, B6 Tags, E2 Recurring tasks | Core task ergonomics |
| **v2 (Should)** | B2 Dependencies, B4 Custom fields, B5 Custom statuses, C2 Calendar, C4 Multi-view, E1 Templates, E3 Form intake | Configurability + planning views |
| **v2 (Could)** | D1 Time tracking, D2 Workload, C3 Gantt, D5 Portfolio | Heavier planning surface |
| **Later (Could)** | D3 Goals/OKRs, D4 Sprints/backlog, C5 Agile reporting, D6 Baselines | Lower urgency for MSP-delivery use case |

---

# THEME A — Collaboration & communication

## A1. Comments & activity feed

**User story.** As a project owner I can discuss a task/project in-thread and see a
chronological history of what changed, so context lives on the work item, not in chat.

**Functional requirements**
- A1-F1 (MUST) Threaded comments on `task` and `project` (and optionally
  `project_milestone`). Author, body (markdown), created/edited timestamps.
- A1-F2 (MUST) Edit/delete own comment; admins delete any. Soft-delete retains audit.
- A1-F3 (MUST) Unified **activity feed** per item interleaving comments with system
  events (status change, assignment, due-date change, attachment added).
- A1-F4 (SHOULD) Feed is paginated, newest-first, filterable (comments only / all).
- A1-F5 (COULD) Reactions/emoji on comments.

**Acceptance criteria**
- Posting a comment appears in the feed without full page reload.
- A status change made via the edit form shows as a system event in the same feed.
- Deleting a comment removes it from view but leaves an audit record.

**Data model.** New `task_comment` / `project_comment` (or polymorphic
`work_comment{ parent_type, parent_id, author_user_id, body, edited_at, deleted_at }`).
Activity feed is a query view over comments + `audit_log` filtered by object.

## A2. @Mentions

**User story.** I can @mention a colleague in a comment to pull them in.

- A2-F1 (MUST) Typeahead of users in comment editor; mention stored as a resolvable
  reference, rendered as a link.
- A2-F2 (MUST) A mention generates a notification to the mentioned user (→ A3).
- A2-F3 (SHOULD) Mentioning a user who is not the owner/assignee adds them as a
  **watcher** (→ B3) unless they opt out.

**Acceptance criteria.** Typing `@` surfaces matching users; the saved comment links
the mention; the mentioned user receives a notification.

## A3. Notifications

**User story.** I'm told when something needs me — assigned, mentioned, due, or
status-changed on items I watch.

- A3-F1 (MUST) In-app notification centre (bell): unread count, list, mark-read,
  deep-link to the item.
- A3-F2 (MUST) Triggers: assigned to me; @mentioned; comment on item I own/watch;
  due-soon / overdue on my items; status → blocked on my project.
- A3-F3 (MUST) **Dispatch is a backend process** (per ADR-0014/0027 Power Automate
  handles outbound channel). GUI writes notification rows; backend fans out to
  email/Teams. No provider keys in the front end.
- A3-F4 (SHOULD) Per-user preferences: per-trigger channel (in-app / email / Teams),
  digest vs. immediate, quiet hours.
- A3-F5 (SHOULD) Due-soon/overdue evaluation runs on a backend schedule, not client.

**Acceptance criteria.** Assigning a task notifies the assignee in-app within one
refresh; with email enabled, a backend-dispatched email arrives; muting a trigger
suppresses it.

**Data model.** `notification{ id, recipient_user_id, kind, parent_type, parent_id,
payload jsonb, read_at, created_at }`; `notification_pref{ user_id, kind, channel,
enabled }`.

## A4. Attachments

**User story.** I can attach a file/screenshot/doc to a task or project.

- A4-F1 (MUST) Upload/download/remove files on `task` and `project`. Show name, size,
  uploader, timestamp.
- A4-F2 (MUST) Storage is access-controlled (Azure Blob or the per-account SharePoint
  site already tracked, migration 0078). No public URLs; links are auth-gated.
- A4-F3 (SHOULD) Inline image preview/thumbnail.
- A4-F4 (SHOULD) File-type allowlist + max-size; AV/scan hook if available.
- A4-F5 (COULD) Link an existing SharePoint document instead of uploading a copy.

**Acceptance criteria.** Uploaded file is downloadable only by authorised users;
removal is audited; attaching adds a system event to the activity feed (A1).

**Data model.** `work_attachment{ id, parent_type, parent_id, storage_ref, filename,
content_type, size_bytes, uploaded_by, created_at, deleted_at }`.

---

# THEME B — Task structure & data model

## B1. Subtasks / hierarchy

- B1-F1 (MUST) A task can have child tasks (`parent_task_id`, `ordinal`). One level
  required; arbitrary depth optional.
- B1-F2 (MUST) Parent shows child progress (n/m done) and a completion rollup.
- B1-F3 (SHOULD) Reorder children; promote/demote a task.
- B1-F4 (SHOULD) Reconcile with existing `onboarding_step` (steps are template-driven
  child items) — either unify or document why they stay separate. **Decision needed
  in the theme ADR.**
- AC: Completing all children optionally prompts/auto-flags parent as done (manual in
  v1; auto only via the excluded rules engine later).

**Data model.** `task.parent_task_id` (nullable FK self), `task.ordinal`.

## B2. Dependencies

- B2-F1 (MUST) "Blocks / blocked-by" links between tasks (and optionally milestones).
- B2-F2 (MUST) A task blocked by an incomplete predecessor is visibly flagged; warn
  on starting/closing out of order (do not hard-block in v1).
- B2-F3 (SHOULD) Dependencies render as connectors on the timeline (C3) and inform
  scheduling.
- B2-F4 (SHOULD) Prevent/detect circular dependencies.
- AC: Creating A blocks B shows the relation on both items; closing the project shows
  any unmet blockers.

**Data model.** `task_dependency{ predecessor_id, successor_id, type }`.

## B3. Multiple assignees & watchers

- B3-F1 (MUST) A task/project supports more than one assignee (keep a single
  "primary owner" for rollups/RBAC).
- B3-F2 (MUST) **Watchers** receive notifications without being assignees.
- B3-F3 (SHOULD) @mention auto-adds watcher (A2-F3); "watch/unwatch" toggle on item.
- AC: All assignees and watchers see the item in their views and receive relevant
  notifications; primary owner still drives status rollups and reporting.

**Data model.** `work_assignment{ parent_type, parent_id, user_id, role:
primary|assignee|watcher }`. Migrate existing `owner_user_id` → `primary` rows.

## B4. Custom fields

- B4-F1 (SHOULD) Admin-definable fields on tasks and/or projects, scoped by
  `project_type` where applicable. Types: text, number, date, single-select,
  multi-select, checkbox, user, currency.
- B4-F2 (SHOULD) Custom fields are filterable, sortable, and shown in list/board.
- B4-F3 (COULD) Required-field enforcement per project type.
- AC: Admin creates a "Risk level" select field on Implementation projects; it appears
  on those projects only and is filterable in reporting.

**Data model.** `custom_field_def{ id, scope, key, label, type, config jsonb,
project_type_id? }` + `custom_field_value{ field_id, parent_type, parent_id, value
jsonb }`.

## B5. Configurable statuses / workflow states

- B5-F1 (SHOULD) Admin-definable status sets per `project_type` (and per task
  category), replacing today's hard-coded enums, with ordering, colour, and a
  category (todo / in-progress / done) for rollups.
- B5-F2 (MUST, if built) Migration maps existing enum values to seeded default sets so
  no data is lost; reporting keys off the todo/in-progress/done category, not labels.
- B5-F3 (COULD) Per-status WIP limits (surface on kanban, C1).
- AC: Admin adds a "Waiting on client" status to Onboarding; it appears as a board
  column and rolls up as in-progress in reporting.

**Data model.** `status_def{ id, scope, project_type_id?, key, label, color,
category, ordinal }`; status columns become FK to `status_def`.

## B6. Tags / labels

- B6-F1 (SHOULD) Free-form, colour-coded tags applicable to tasks and projects;
  global tag vocabulary with rename/merge.
- B6-F2 (SHOULD) Filter any view by one/more tags.
- AC: Tagging tasks "urgent" across projects lets a user filter all urgent work.

**Data model.** `tag{ id, label, color }` + `work_tag{ tag_id, parent_type,
parent_id }`. (Distinct from existing `task.category`, which stays as the
sales/project/onboarding/general partition.)

---

# THEME C — Views

## C1. Kanban board (drag-drop)

> **Status:** tasks board shipped #341 (drag-drop, enum columns, category-filter-aware,
> List|Board toggle); projects board shipped #441 (same shape over `project_status`,
> List|Board toggle, started_at/completed_at stamped on drop). F1 now complete for both
> objects. F2 group-by shipped #443 (shared `KanbanBoard` primitive; tasks group by
> status|category, projects by status|type, drag reassigns the active dimension —
> assignee/tag deferred to ADR-0064/0065 data). F5 WIP limits shipped #445
> (per-column, per-browser localStorage cap with over-limit highlight; an aid, not
> a hard block). F3 swimlanes shipped #447 (optional collapsible bands orthogonal to
> the columns — tasks by account|category, projects by account|owner|type; drag still
> only reassigns the column dimension). Remaining C1 scope (F4 rich cards) tracked in
> #439, blocked on ADR-0064/0065 data; activity-feed event (A1) in #438.

- C1-F1 (MUST) Board view of tasks and of projects, columns = status (B5 once built,
  else current enum). Drag a card between columns to change status.
- C1-F2 (MUST) Group-by selector (status default; assignee, project_type, tag).
- C1-F3 (SHOULD) Swimlanes (e.g. by project or assignee); collapse/expand.
- C1-F4 (SHOULD) Card shows assignee avatar(s), due date, tags, subtask progress,
  attachment/comment counts.
- C1-F5 (COULD) WIP limits per column (B5-F3) with over-limit highlight.
- AC: Dragging a card to "Done" persists the status change and emits a system event
  (A1); board reflects filters from the list view.

## C2. Calendar view

- C2-F1 (SHOULD) Month/week calendar of tasks/milestones by due date (and start date
  if added). Drag to reschedule.
- C2-F2 (SHOULD) Filter by assignee, project, project_type, tag.
- C2-F3 (COULD) iCal feed / Outlook overlay (read-only) — defer if it implies API.
- AC: Moving a task on the calendar updates its due date and is audited.

## C3. Gantt / timeline

- C3-F1 (COULD) Timeline with bars per task/milestone (start→due), dependency
  connectors (B2), and milestone diamonds.
- C3-F2 (COULD) Drag to reschedule/resize; dependent items shift (suggest, don't
  force) on change.
- C3-F3 (COULD) Critical-path highlight.
- C3-F4 (SHOULD, if built) Requires a **start date** field on tasks (add
  `task.start_at`).
- AC: A project's milestones render as a timeline; a blocked-by link draws a connector.

## C4. Multiple views per dataset

- C4-F1 (SHOULD) One dataset (e.g. a project's tasks), switchable between List /
  Board / Calendar / Timeline without navigating away.
- C4-F2 (SHOULD) View-level saved filters/sort/group per user.
- C4-F3 (COULD) Saved/shared views.
- AC: Toggling List→Board on a project keeps the active filter set.

## C5. Agile reporting (burndown / velocity / cumulative flow)

- C5-F1 (COULD) Burndown for a sprint/date-range; velocity across sprints; cumulative
  flow by status. Depends on D1 (estimates) and D4 (sprints).
- AC: A sprint shows remaining-effort burndown sourced from estimates + status history.

---

# THEME D — Planning & resource management

## D1. Time tracking & estimates

- D1-F1 (SHOULD) Per-task **estimate** (hours or points; configurable unit per
  project_type).
- D1-F2 (SHOULD) Log time against a task (manual entry; optional start/stop timer).
- D1-F3 (SHOULD) Rollup estimate vs. logged at milestone/project level.
- D1-F4 (COULD) Billable flag on time entries for downstream invoicing.
- AC: Logging 2h on a task increments project "logged" rollup and shows remaining vs.
  estimate.

**Data model.** `task.estimate`, `task.estimate_unit`; `time_entry{ task_id, user_id,
minutes, started_at?, note, billable }`.

## D2. Workload / capacity

- D2-F1 (COULD) Per-user workload view: assigned open work (count + estimated hours)
  over a date range.
- D2-F2 (COULD) Over-allocation highlight against a per-user weekly capacity.
- D2-F3 (COULD) Reassign from the workload view.
- AC: A user with assignments exceeding capacity in a week is flagged; reassigning
  updates both users' loads.

**Data model.** `user_capacity{ user_id, weekly_hours }`; load derived from
assignments + estimates.

## D3. Goals / OKRs

- D3-F1 (COULD) Goal object above projects with measurable key results; link
  projects/tasks that contribute.
- D3-F2 (COULD) Auto-progress from linked work completion or manual %.
- AC: A goal shows rolled-up progress from its linked projects.

**Data model.** `goal{ id, name, owner, period, target, current }` +
`goal_link{ goal_id, parent_type, parent_id, weight }`.

## D4. Sprints / backlog

- D4-F1 (COULD) Backlog list + sprint/iteration container with start/end; assign
  tasks to a sprint; board scoped to active sprint.
- D4-F2 (COULD) Carry-over of unfinished items to next sprint.
- AC: Tasks added to "Sprint 5" appear on the sprint board; closing the sprint moves
  open items forward.

**Data model.** `sprint{ id, name, project_id?, starts_at, ends_at, status }`;
`task.sprint_id`.

## D5. Portfolio rollup

- D5-F1 (COULD) Cross-project view rolling up status/health/owner/target-date across
  all projects (or a selected set), beyond today's per-type grouping.
- D5-F2 (COULD) Filter by account, owner, type, health; export.
- AC: A portfolio view lists every active project with health and next milestone in
  one screen.

## D6. Baselines / forecast-vs-actual

- D6-F1 (COULD) Capture a baseline (target dates) at project start; compare planned
  vs. actual on completion; show slippage.
- AC: A project completed two weeks late shows +14d slippage vs. baseline.

**Data model.** `project_baseline{ project_id, captured_at, planned_dates jsonb }`.

---

# THEME E — Templates & intake

## E1. User-editable project & task templates

- E1-F1 (SHOULD) Admins create reusable project templates: pre-populated milestones,
  steps/tasks, default assignees/roles, custom-field defaults — generalising today's
  hard-coded onboarding playbook.
- E1-F2 (SHOULD) Apply a template when creating a project; future template edits do
  **not** retro-mutate live projects.
- E1-F3 (SHOULD) Task checklist templates (apply a set of subtasks to a task).
- E1-F4 (SHOULD) Existing onboarding playbook becomes the seeded, protected default
  template (no behaviour change for current onboarding).
- AC: Admin defines an "Implementation" template with 4 milestones; creating a project
  from it instantiates those milestones and their steps.

**Data model.** `project_template{ id, name, project_type_id, is_protected }` +
`template_item{ template_id, kind: milestone|step|task, parent_ref, ordinal, payload
jsonb }`.

## E2. Recurring tasks

- E2-F1 (SHOULD) A task can recur on a schedule (daily/weekly/monthly/custom RRULE);
  on completion (or on schedule) the next instance is generated.
- E2-F2 (MUST, if built) **Instance generation is a backend scheduled process**
  (NFR-4) — the GUI defines the recurrence; the backend materialises occurrences.
- E2-F3 (SHOULD) Edit-this vs. edit-series semantics; end conditions (until date /
  N occurrences).
- AC: A weekly recurring task spawns the next instance on completion with the correct
  due date; ending the series stops generation.

**Data model.** `task_recurrence{ task_id, rule, next_run_at, ends_at, count_remaining
}`.

## E3. Forms → task/project intake

- E3-F1 (SHOULD) Internal intake forms that create a task/project on submit (reuse the
  existing `event.registration_page` jsonb form pattern, migration 0070).
- E3-F2 (SHOULD) Map form fields → task fields (title, assignee, project, custom
  fields); route to a default project/queue.
- E3-F3 (COULD) Staff-authenticated submission only in v1 (external/public intake is a
  later, separately-scoped decision — borders on the excluded public-API surface).
- AC: Submitting the "New client request" form creates a task in the target project
  with mapped fields.

---

# 4. Data-model delta (summary)

New tables: `work_comment`, `notification`, `notification_pref`, `work_attachment`,
`task_dependency`, `work_assignment`, `custom_field_def`, `custom_field_value`,
`status_def`, `tag`, `work_tag`, `time_entry`, `user_capacity`, `goal`, `goal_link`,
`sprint`, `project_baseline`, `project_template`, `template_item`, `task_recurrence`.

Altered columns: `task.parent_task_id`, `task.ordinal`, `task.start_at`,
`task.estimate(+unit)`, `task.sprint_id`; `project`/`task` status FK → `status_def`
(B5); `owner_user_id` migrated into `work_assignment` (B3).

Reconciliation flagged for the relevant ADRs: `onboarding_step` ↔ subtasks (B1-F4);
`task.category` ↔ tags (B6); existing `workflow` engine ↔ recurrence/notifications
(reuse step kinds where possible).

# 5. Open decisions (resolve in theme ADRs before build)

1. Polymorphic `parent_type/parent_id` comment/attachment/assignment tables vs.
   per-entity tables. (Recommend polymorphic for reuse; verify FK/index strategy.)
2. Whether subtasks subsume `onboarding_step` or coexist (B1-F4).
3. Attachment storage: Azure Blob vs. per-account SharePoint (A4-F2 / A4-F5).
4. Notification channel matrix and whether Teams is in v1 (A3-F3).
5. Estimate unit: hours vs. points, and whether it's per-project-type (D1-F1).

# 6. Next steps (per §3 workflow)

1. Split into theme ADRs (A–E) in `docs/decision-records/`.
2. Open an epic per theme; slice into ≤400-line micro-PRs (one capability each).
3. Schema migrations land first in `ImperionCRM` with `graphify affected` blast
   radius recorded; backend processes (notification dispatch, recurrence generator)
   follow in `ImperionCRM_Backend`.
