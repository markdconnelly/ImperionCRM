---
adr: 0094
title: "Project-management parity platform — consolidated dossier"
status: accepted
date: 2026-06-16
repo: frontend
summary: "Consolidated dossier of the project-management parity cluster: the in-app PM feature platform that closes the table-stakes gaps versus Asana/Jira/Monday — polymorphic collaboration (comments, @mentions, backend-dispatched notifications, attachments), extended task structure (subtasks, dependencies, multi-assignment, custom fields, configurable statuses, tags), an in-app multi-view layer (kanban, calendar, timeline), the planning model (time/estimates, workload, goals, sprints, portfolio, baselines), and user-editable templates + recurring tasks + form intake. Carries every member decision and amendment clause verbatim with a zero-loss traceability table; member ADRs are retained."
tags: [pm]
consolidates: [ADR-0064, ADR-0065, ADR-0066, ADR-0069, ADR-0070]
---
# ADR-0094: Project-management parity platform — consolidated dossier

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Consolidates** | ADR-0064 · ADR-0065 · ADR-0066 · ADR-0069 · ADR-0070 (all retained on disk; each keeps its real status — all five remain `Accepted` — and gains `consolidated_into: ADR-0094`) |
| **Cross-references** | ADR-0090 (consolidation method, dossier + traceability + retained originals) · ADR-0084 (claim ADR numbers at merge) · ADR-0042 (four-repo division of labor — frontend is GUI-only, every *process* is a backend capability) · ADR-0010 (single shared `task` model for sales + delivery) · ADR-0052 (project board — user-creatable `project_type`, `task.project_id`) · ADR-0034 (milestones + R/Y/G health) · ADR-0037 (onboarding playbook instantiation) · ADR-0014 / ADR-0027 (workflow automation / Power Automate outbound notifications) · ADR-0053 (events / `registration_page` JSON-form contract reused by intake) · ADR-0061 (ICM automation) · ADR-0062 (reporting BI hub — consumes PM planning inputs) · ADR-0030 / ADR-0016 (roles & identity the PM RBAC gates extend) · `docs/product/pm-feature-requirements.md` (Themes A–E, the requirement source) |

## Purpose & scope

This is a consolidation dossier produced under [ADR-0090](./ADR-0090-adr-ingestion-overhaul.md). It folds the **project-management parity cluster** — the five decision records that together define Imperion's in-app project-management feature platform, the coherent surface that closes the table-stakes gaps versus mainstream PM tools (Asana / Jira / Monday) — into one ingestible record, so that "the current decision about the PM feature platform" can be reconstructed from a single file rather than five theme ADRs and their cross-dependencies.

**Zero loss is the binding constraint (ADR-0090).** A decision is "lost" only if it appears in *no* active record. This dossier therefore:

- **Synthesizes** the current PM-parity decision (the section immediately below);
- **Carries every member decision and every amendment/shipped-slice clause VERBATIM** (the per-member sections that follow — quoted directly from each source ADR's *Decision* and binding clauses);
- **Proves zero loss with a traceability table** mapping each source ADR's decision(s) to its dossier section;
- **Retains every member file on disk** with `consolidated_into: ADR-0094` and an inbound pointer — so history and inbound links survive (ADR-0090).

**Member statuses are preserved verbatim (ADR-0090).** All five members are `Accepted` and stay `Accepted`. There is **no supersession in this cluster** — the members are mutually reinforcing, not competing: ADR-0064's notifications/watchers depend on ADR-0065's `work_assignment`; ADR-0066's board columns are ADR-0065's configurable `status_def` and its timeline consumes ADR-0065's dependencies + the shared `task.start_at`; ADR-0069's planning model feeds ADR-0062's reporting and ADR-0066's agile charts; ADR-0070's templates instantiate ADR-0065's task structure and its recurrence/notification jobs join ADR-0064's backend scheduler. Consolidation adds the `consolidated_into` pointer but flips no decision's status. Two members carry **shipped-slice annotations** in their bodies (ADR-0066 C4 multi-view toggle #344; ADR-0070 E3 in-place form edit #639) — these are preserved verbatim.

**Boundaries preserved (system CLAUDE.md §1, single-owner rule).** This repo is GUI-only and owns the schema; any *process* is a backend capability (ADR-0042). The cross-repo references therefore remain **references, never absorptions**: the backend's notification fan-out to email/Teams via Power Automate + the scheduled due-soon/overdue evaluation (ADR-0064), the backend recurrence materialiser job (ADR-0070), and the no-code rules engine that several members explicitly defer to are **cited as backend/out-of-scope capabilities only**, not specified here. The requirement source `docs/product/pm-feature-requirements.md` (Themes A–E, with its NFRs) is referenced, not copied.

---

## Synthesis — the current PM-parity decision

Imperion builds a **self-contained, in-app project-management feature platform** on its existing single shared `task`/`project` model (ADR-0010 / ADR-0052), closing the table-stakes gaps versus mainstream PM tools **without** forking the data model, embedding a third-party board widget, or leaving the work item for Teams/Outlook. The platform is GUI-first; every *process* (notification fan-out, recurrence generation, scheduled due evaluation) is a backend capability (ADR-0042). In current form:

1. **Collaboration is polymorphic and backend-dispatched (ADR-0064).** A single reusable surface — `work_comment` (markdown body, soft-delete-for-audit), `work_attachment` (Azure Blob, SAS-gated, type allowlist + size cap server-side), and a `notification` + `notification_pref` pair — drops into task, project, and milestone detail with one implementation, addressing the highest-perceived go-live gap. **@Mentions** are resolvable user refs that emit a notification and (unless opted out) add the user as a watcher. The activity feed is a read view interleaving `work_comment` with `audit_log`. The **front end never holds a provider key**: the in-app bell reads the `notification` table directly, while the **backend** owns fan-out to email/Teams via Power Automate (ADR-0014/0027) and the scheduled due-soon/overdue evaluation — the GUI slice can ship the bell before the outbound channel is wired (degrade gracefully).

2. **Task structure is extended in place, not forked (ADR-0065).** The flat fixed model gains **subtasks** (`task.parent_task_id` self-FK + `task.ordinal`; `onboarding_step` coexists for now, unifying it as a task `kind` is a tracked follow-up), **dependencies** (`task_dependency`, flagged/warned not hard-blocked in v1, circular detection required), **multi-assignment & watchers** (`work_assignment{role: primary|assignee|watcher}`, migrating `owner_user_id` → one `primary` row; the primary owner still drives status rollups + RBAC), **custom fields** (`custom_field_def` + `custom_field_value` jsonb EAV, scoped per `project_type`, GIN-indexed), **configurable statuses** (`status_def` with a `category` of todo/in_progress/done — **reporting re-keys off `category`, not labels**, and a migration maps today's enum values to seeded defaults so **no data is lost**), and **tags** (`tag` + `work_tag`, distinct from `task.category`). The status-FK migration is the highest-blast-radius change — gated behind seeded defaults so live data is untouched on deploy.

3. **Views are an in-app multi-view layer over data the GUI already reads (ADR-0066).** A shared filter/sort/group state backs **kanban** (v1; columns = `status_def`, drag persists the status change + emits an activity event; group-by, WIP limits, swimlanes), **calendar** (v2; month/week by due date + `task.start_at`, drag-to-reschedule audited), and **timeline/Gantt** (could; bars `start_at`→due, dependency connectors, milestone diamonds, optional critical-path — **requires `task.start_at`**). A **multi-view toggle** switches one dataset List/Board/Calendar/Timeline without navigation; **shipped (#344)** as URL-state preserving the active filter set, with per-user **saved views as named localStorage snapshots** of the query string (no migration; client-side, private to the browser, cap 20) — shared/team saved views need a server-side view object and stay a follow-up. All views honour existing RBAC reads; drag goes through the same audited mutation path; large boards virtualize.

4. **Planning is a coherent model built incrementally (ADR-0069).** The full planning shape is fixed now and built table-by-table with its first consuming slice (mostly v2/later): **time tracking & estimates** (`task.estimate` + `task.estimate_unit` configurable per project_type; `time_entry{minutes, billable}`), **workload/capacity** (`user_capacity`; load = open assignments × estimates, over-allocation highlight), **goals/OKRs** (`goal` + `goal_link`), **sprints/backlog** (`sprint` + `task.sprint_id`), **portfolio rollup** (cross-project status/health/owner/target beyond per-type grouping), and **baselines** (`project_baseline`, planned-vs-actual slippage). Time entries/capacity are staff-performance data → RBAC-gated + audited; `billable` is financial-adjacent with **no automated money movement**. This model feeds the BI hub (ADR-0062) and the agile charts (ADR-0066 C5).

5. **Templates, recurrence, and intake generalise the playbook (ADR-0070).** **Editable templates** (`project_template` + `template_item`) generalise the hard-coded onboarding playbook (ADR-0037) into user-defined ones; **applying a template snapshots items** onto the new project (later template edits do not retro-mutate live projects) and the existing playbook becomes the **seeded, protected default** (no behaviour change). **Recurring tasks** (`task_recurrence{rule(RRULE), next_run_at, ...}`) are defined in the GUI but **materialised by a backend scheduled job** (idempotent, catch-up-on-missed-runs) — recurrence is a scheduled materialiser, **not** the out-of-scope no-code rules engine. **Form intake** (`intake_form` reusing the `event.registration_page` JSON-form pattern, ADR-0053) maps submitted fields → a task/project and is **staff-authenticated only in v1** (external/public intake borders the excluded public-API surface, deferred); **shipped (#639)** with in-place editing that patches the existing `intake_form` row so its id/`key` and prior submissions survive.

6. **Repo split (ADR-0042).** Frontend owns the schema (all PM migrations here) + every GUI surface (collaboration components, the view layer, planning/template/intake builders, the in-app notification bell). The **backend** owns every *process*: notification fan-out via Power Automate, the scheduled due-soon/overdue evaluation, and the recurrence materialiser. The **no-code rules / automation engine** (auto-complete-on-children, notification-generating rules, capacity-aware assignment) is **explicitly out of scope** across the cluster — a separate feature request, referenced never absorbed.

### Cross-member dependency web (preserved verbatim)

The five members are mutually reinforcing; the binding dependencies the dossier carries:

- **ADR-0064 depends on ADR-0065** — @mentions/notifications/watchers (A2/A3) rely on ADR-0065's `work_assignment` (B3); ADR-0064 states this explicitly ("Watchers/assignees are defined in ADR-0065 (`work_assignment`); A2/A3 depend on it").
- **ADR-0066 depends on ADR-0065** — board columns are ADR-0065's configurable `status_def` (B5); the timeline consumes ADR-0065's dependencies (B2) and the shared **`task.start_at`** added once in the ADR-0065/0066 boundary migration (also used by the calendar).
- **ADR-0066 C5 (agile reporting) depends on ADR-0069** — burndown/velocity/cumulative-flow need ADR-0069's estimates (D1) and sprints (D4); deferred with them.
- **ADR-0069 feeds ADR-0062 and ADR-0066** — the planning model is the input to the reporting BI hub (ADR-0062) and the agile charts (ADR-0066 C5); it builds on ADR-0065's assignment (B3).
- **ADR-0070 builds on ADR-0065, ADR-0037, ADR-0053, and ADR-0064** — templates instantiate ADR-0065's task structure (B1 checklist templates) and generalise the ADR-0037 playbook; intake reuses the ADR-0053 `registration_page` form contract; the recurrence materialiser joins ADR-0064's notification scheduler in the backend.

All five members are **Accepted** and preserved unchanged. Consolidation alters no decision's status.

---

## Traceability table (zero-loss proof)

Every cluster member (the 5 named in #760), each source decision, and the dossier section that carries it verbatim. The retained member file is the second proof of non-loss.

| Source ADR | Status | Decision(s) carried | Dossier section |
|---|---|---|---|
| **ADR-0064** | Accepted | Polymorphic collaboration: `work_comment` (markdown, soft-delete-for-audit) + activity feed interleaving `audit_log`; @mentions as resolvable refs → notification + auto-watch; `notification` + `notification_pref` with the in-app bell reading the table directly and the **backend** owning Power Automate fan-out + scheduled due evaluation (FE holds no provider key); `work_attachment` on Azure Blob (SAS-gated, type allowlist + size cap, AV-scan hook). Depends on ADR-0065 `work_assignment` | Synthesis §1, §6 · Dependency web · [M1 — ADR-0064](#m1--adr-0064-pm-collaboration--comments-mentions-notifications-attachments) |
| **ADR-0065** | Accepted | Extend `task`/`project` in place: subtasks (`parent_task_id`+`ordinal`, `onboarding_step` coexists); dependencies (`task_dependency`, flag/warn not hard-block, circular detection); assignment+watchers (`work_assignment{primary\|assignee\|watcher}`, owner→primary backfill); custom fields (`custom_field_def`+`custom_field_value` jsonb, per project_type, GIN); configurable statuses (`status_def` with todo/in_progress/done category, enum→seeded-defaults migration so no data lost, reporting re-keys off category); tags (`tag`+`work_tag` distinct from `category`) | Synthesis §2, §6 · Dependency web · [M2 — ADR-0065](#m2--adr-0065-pm-task-structure--hierarchy-dependencies-assignment-custom-fields-statuses-tags) |
| **ADR-0066** | Accepted | In-app multi-view layer over existing reads with shared filter/sort/group state: kanban (v1, columns=`status_def`, drag persists+emits event, group-by/WIP/swimlanes); calendar (v2, by due + `start_at`, drag-reschedule audited); timeline/Gantt (could, `start_at`→due bars, dependency connectors, milestone diamonds, optional critical-path, **requires `task.start_at`**); multi-view toggle (**shipped #344** as URL-state preserving filters; saved views = localStorage query-string snapshots, no migration, cap 20; shared/team views follow-up); agile reporting (C5, later, deferred with ADR-0069 D1/D4). RBAC reads honoured, audited drag, virtualize large boards | Synthesis §3, §6 · Dependency web · [M3 — ADR-0066](#m3--adr-0066-pm-views--kanban-board-calendar-timeline-multi-view) |
| **ADR-0069** | Accepted | Coherent planning model, built table-by-table with its first slice (mostly v2/later): time tracking+estimates (`task.estimate`/`estimate_unit` per project_type, `time_entry{minutes,billable}`); workload/capacity (`user_capacity`, load from assignments×estimates, over-allocation highlight); goals/OKRs (`goal`+`goal_link`); sprints/backlog (`sprint`+`task.sprint_id`, carry-over); portfolio rollup (cross-project beyond per-type); baselines (`project_baseline`, planned-vs-actual). RBAC-gated staff-performance data, audited; `billable` financial-adjacent, no automated money movement. Feeds ADR-0062 + ADR-0066 C5 | Synthesis §4, §6 · Dependency web · [M4 — ADR-0069](#m4--adr-0069-pm-planning--time-tracking-workload-goals-sprints-portfolio-baselines) |
| **ADR-0070** | Accepted | Generalise the playbook: editable templates (`project_template`+`template_item`, **apply = snapshot** so edits don't retro-mutate, onboarding playbook becomes seeded protected default); recurring tasks (`task_recurrence{RRULE}` defined in GUI, **materialised by an idempotent catch-up backend job**, edit-this-vs-series, end by date/count — a materialiser not a rules engine); form intake (`intake_form` reusing `event.registration_page` JSON pattern, **staff-authenticated v1**, external deferred near the excluded public API; **shipped #639** in-place edit patching the row so id/`key`/prior submissions survive) | Synthesis §5, §6 · Dependency web · [M5 — ADR-0070](#m5--adr-0070-pm-templates-recurring-tasks-and-form-intake) |

**Member count: 5.** No supersession within the cluster (all five Accepted and mutually reinforcing). Cross-repo / out-of-scope references preserved as references (not absorbed): the **backend** notification fan-out via Power Automate + scheduled due-soon/overdue evaluation (ADR-0064) and the **backend** recurrence materialiser (ADR-0070); the **no-code rules / automation engine** (auto-complete-on-children, notification-generating rules, capacity-aware assignment suggestions). In-repo references preserved (not absorbed): ADR-0010 (single task model), ADR-0052 (project board / `project_type`), ADR-0034 (milestone health), ADR-0037 (onboarding playbook), ADR-0053 (registration-page form), ADR-0062 (BI hub), ADR-0014/0027 (Power Automate notification channel), ADR-0061 (ICM), ADR-0030/0016 (roles & identity), and `docs/product/pm-feature-requirements.md` (Themes A–E + NFRs).

---

# Member decisions (verbatim)

Each section below reproduces the governing decision text of one member ADR **verbatim** from its source file. The full source ADR (Problem / Context / Options / Consequences / Future considerations) is retained on disk under its original filename; only its decision and binding clauses are quoted here, which is what the zero-loss guarantee requires.

## M1 — ADR-0064 (PM collaboration — comments, mentions, notifications, attachments)

> Source: [`ADR-0064-pm-collaboration-comments-mentions-notifications-attachments.md`](./ADR-0064-pm-collaboration-comments-mentions-notifications-attachments.md) · Status: **Accepted** (2026-06-12)

**Decision (verbatim):**

> Adopt the **polymorphic** model and a backend-dispatched notification pipeline:
>
> - **Comments & activity feed** — `work_comment{ id, parent_type, parent_id,
>   author_user_id, body(markdown), edited_at, deleted_at, created_at }`. The
>   activity feed is a read view interleaving `work_comment` with `audit_log` events
>   for the same object. Soft-delete retains audit (NFR-2). Covers A1.
> - **@Mentions** — stored as resolvable user refs in comment body; a mention emits
>   a notification and (unless opted out) adds the user as a watcher. Covers A2.
> - **Notifications** — GUI writes `notification{ id, recipient_user_id, kind,
>   parent_type, parent_id, payload jsonb, read_at, created_at }` +
>   `notification_pref{ user_id, kind, channel, enabled }`. The **backend** owns
>   fan-out to email/Teams via Power Automate and runs the scheduled due-soon/overdue
>   evaluation. The front end never holds a provider key. In-app bell reads the
>   table directly. Covers A3.
> - **Attachments** — `work_attachment{ id, parent_type, parent_id, storage_ref,
>   filename, content_type, size_bytes, uploaded_by, deleted_at, created_at }`.
>   Primary store **Azure Blob** (auth-gated SAS, no public URLs); a later option
>   links an existing per-account SharePoint document instead of copying (A4-F5).
>   Type allowlist + size cap enforced server-side. Covers A4.
>
> Watchers/assignees are defined in ADR-0065 (`work_assignment`); A2/A3 depend on it.

## M2 — ADR-0065 (PM task structure — hierarchy, dependencies, assignment, custom fields, statuses, tags)

> Source: [`ADR-0065-pm-task-structure-hierarchy-fields-statuses.md`](./ADR-0065-pm-task-structure-hierarchy-fields-statuses.md) · Status: **Accepted** (2026-06-12)

**Decision (verbatim):**

> Extend the existing `task`/`project` model:
>
> - **Subtasks (B1)** — `task.parent_task_id` (nullable self-FK) + `task.ordinal`.
>   One level required in v1, arbitrary depth allowed. Parent shows n/m child rollup;
>   auto-complete-on-children is manual in v1 (auto only via the out-of-scope rules
>   engine). `onboarding_step` **coexists** for now; unifying steps as a task `kind`
>   is a tracked follow-up (B1-F4 decision: coexist).
> - **Dependencies (B2)** — `task_dependency{ predecessor_id, successor_id, type }`.
>   Blocked items are flagged and warn on out-of-order start/close; not hard-blocked
>   in v1. Circular-dependency detection required.
> - **Assignment & watchers (B3)** — `work_assignment{ parent_type, parent_id,
>   user_id, role: primary|assignee|watcher }`. Migrate existing
>   `owner_user_id` → one `primary` row per item. Primary owner still drives status
>   rollups and RBAC; assignees/watchers drive views and notifications (ADR-0064).
> - **Custom fields (B4)** — `custom_field_def{ id, scope, key, label, type, config
>   jsonb, project_type_id? }` + `custom_field_value{ field_id, parent_type,
>   parent_id, value jsonb }`. Filterable/sortable; scoped per project_type.
> - **Configurable statuses (B5)** — `status_def{ id, scope, project_type_id?, key,
>   label, color, category(todo|in_progress|done), ordinal }`. Status columns become
>   FK to `status_def`; a migration maps today's enum values to seeded default sets so
>   **no data is lost** and reporting re-keys off `category`, not labels. Optional
>   per-status WIP limits surface on the kanban board (ADR-0066).
> - **Tags (B6)** — `tag{ id, label, color }` + `work_tag{ tag_id, parent_type,
>   parent_id }`, distinct from `task.category` (which stays as the
>   sales/project/onboarding/general partition).

## M3 — ADR-0066 (PM views — kanban board, calendar, timeline, multi-view)

> Source: [`ADR-0066-pm-views-board-calendar-timeline.md`](./ADR-0066-pm-views-board-calendar-timeline.md) · Status: **Accepted** (2026-06-12)

**Decision (verbatim):**

> Build an in-app view layer, prioritised within the theme:
>
> - **Kanban board (C1, v1)** — board for tasks and for projects; columns = status
>   (`status_def`, else current enum). Drag persists the status change and emits a
>   system event (ADR-0064 activity feed). Group-by selector (status default;
>   assignee, project_type, tag); swimlanes and per-column WIP limits as SHOULD/COULD.
>   Cards show assignee avatars, due date, tags, subtask progress, comment/attachment
>   counts.
> - **Calendar (C2, v2)** — month/week by due date (and `start_at` once added); drag to
>   reschedule (audited); filter by assignee/project/type/tag.
> - **Timeline / Gantt (C3, could)** — bars per task/milestone (`start_at`→due),
>   dependency connectors (B2), milestone diamonds, optional critical-path. **Requires
>   adding `task.start_at`** (also used by calendar). Reschedule suggests, never forces,
>   dependent shifts.
> - **Multi-view toggle (C4, v2)** — one dataset switchable List/Board/Calendar/Timeline
>   without navigation; per-user saved filters/sort/group; shared/saved views later.
>   **Shipped (#344):** the toggle + filter preservation are URL-state — switching
>   List/Board/Calendar carries category/group/swimlane/tag along, so a view switch
>   keeps the active filter set (the C4 acceptance). Per-user saved views are **named
>   snapshots of that query string, persisted in localStorage** — this lane carries
>   **no migration**, so saved views are client-side and private to the browser (cap
>   20). Timeline is part of the toggle only once C3 lands (it needs `task.start_at`).
>   **Shared/team saved views** need a server-side view object (a column/table) and
>   stay a follow-up under *Future considerations*. Helpers: `src/lib/task-views.ts`
>   (pure, tested); UI: `src/components/tasks/task-saved-views.tsx`.
> - **Agile reporting (C5, later)** — burndown/velocity/cumulative-flow; depends on
>   estimates (ADR-0069 D1) and sprints (D4); deferred with them.

## M4 — ADR-0069 (PM planning — time tracking, workload, goals, sprints, portfolio, baselines)

> Source: [`ADR-0069-pm-planning-time-workload-goals-portfolio.md`](./ADR-0069-pm-planning-time-workload-goals-portfolio.md) · Status: **Accepted** (2026-06-12)

**Decision (verbatim):**

> Adopt the following model; build per the phase column in the requirements set
> (mostly v2/later):
>
> - **Time tracking & estimates (D1, v2)** — `task.estimate`, `task.estimate_unit`
>   (configurable per project_type); `time_entry{ task_id, user_id, minutes, started_at?,
>   note, billable }`. Rollup estimate vs. logged at milestone/project.
> - **Workload / capacity (D2, could)** — `user_capacity{ user_id, weekly_hours }`; load
>   derived from open assignments × estimates over a range; over-allocation highlight;
>   reassign from the view.
> - **Goals / OKRs (D3, later)** — `goal{ id, name, owner, period, target, current }` +
>   `goal_link{ goal_id, parent_type, parent_id, weight }`; progress manual or rolled up
>   from linked work.
> - **Sprints / backlog (D4, later)** — `sprint{ id, name, project_id?, starts_at,
>   ends_at, status }` + `task.sprint_id`; backlog list + active-sprint board scope;
>   carry-over of unfinished items.
> - **Portfolio rollup (D5, could)** — cross-project view of status/health/owner/
>   target-date beyond per-type grouping; filter by account/owner/type/health; export.
> - **Baselines (D6, could)** — `project_baseline{ project_id, captured_at, planned_dates
>   jsonb }`; planned-vs-actual slippage on completion.

## M5 — ADR-0070 (PM templates, recurring tasks, and form intake)

> Source: [`ADR-0070-pm-templates-recurrence-intake.md`](./ADR-0070-pm-templates-recurrence-intake.md) · Status: **Accepted** (2026-06-12)

**Decision (verbatim):**

> - **Editable templates (E1, v2)** — `project_template{ id, name, project_type_id,
>   is_protected }` + `template_item{ template_id, kind: milestone|step|task, parent_ref,
>   ordinal, payload jsonb }`. Applying a template **snapshots** items onto the new
>   project; later edits don't retro-mutate live projects. Task checklist templates
>   apply a set of subtasks (ADR-0065 B1) to a task. The existing onboarding playbook
>   becomes the **seeded, protected default** template — no behaviour change for current
>   onboarding.
> - **Recurring tasks (E2, v1-should)** — `task_recurrence{ task_id, rule(RRULE),
>   next_run_at, ends_at, count_remaining }`. The GUI defines the recurrence; the
>   **backend** scheduled job materialises the next occurrence on completion/schedule
>   (NFR-4). Edit-this vs. edit-series semantics; end by date or count.
> - **Form intake (E3, v2)** — internal intake forms reusing the `event.registration_page`
>   JSON-form pattern; submit maps fields → a task/project (title, assignee, project,
>   custom fields) and routes to a default project/queue. **Staff-authenticated only in
>   v1**; external/public intake is a later, separately-scoped decision (it borders on
>   the excluded public-API surface). **Editing is in-place** (#639): a form's definition
>   is patched on the existing `intake_form` row, so its id and stable `key` — and the
>   prior submissions joined on `intake_submission.form_id` — survive an edit. The
>   `is_active` flag is author-controlled (an inactive form stops accepting submissions
>   without being deleted). The builder reuses the same `payload` JSON contract for both
>   create and edit.

---

## Consequences

### Security impact

No change to any security posture — this is a documentation consolidation (ADR-0090). Every security control of the member ADRs remains in force and is carried verbatim: comments and attachments may carry **client PII** → access-controlled storage, no plaintext logging, never copied into issues/PRs (ADR-0064, `unified-security-standard.md` NFR-3); attachment upload enforces a **type allowlist + size cap + AV-scan hook server-side**, with **short-lived per-request SAS URLs and no public blob URLs** (ADR-0064); the **front end never holds a provider key** — notification fan-out is a backend capability (ADR-0064, ADR-0042); custom fields can capture PII and are handled like any task field, with field definitions an **admin-permissioned** action (ADR-0065); assignment/status/drag changes go through the **same audited mutation path** as the edit form (ADR-0065/0066, NFR-2); all views honour **existing RBAC reads** (ADR-0066, NFR-1); time entries and capacity are **staff-performance data → RBAC-gated visibility + audited**, and `billable` is treated as financial-adjacent with **no automated money movement** (ADR-0069); templates and intake forms are **admin-permissioned**, intake that creates work from form input must **validate/sanitise input (OWASP, §5)** and stays **staff-authenticated in v1** to avoid an unauthenticated write surface, and the recurrence job runs under a **service identity, audited** (ADR-0070). `Never commit secrets` — no secrets, tokens, or client PII appear in this dossier or any member file; the unified security standard governs storage and the backend custodies any provider credentials.

### Cost impact

None from the consolidation. No runtime, schema, or model change here. Slightly larger ADR corpus to index (one added file); the generated index and `adr-index.json` absorb it mechanically. The member ADRs' own cost notes are carried verbatim and unchanged: Azure Blob storage + egress is low and notification volume is bounded by batch/digest preferences (ADR-0064); task-structure and planning changes are **schema + indexes only, negligible** (ADR-0065/0069); the view layer adds only client bundle size with virtualization keeping render cost bounded (ADR-0066); templates/recurrence add **one backend timer-trigger and negligible storage** (ADR-0070).

### Operational impact

The PM-parity decision surface is now reconstructable from one file. Member files are retained with `consolidated_into: ADR-0094` — all five keep `status: accepted` — so all inbound `ADR-NNNN` links and history survive. The generated README index (`scripts/adr-index.mjs`) and `adr-index.json` are regenerated in the same change; `--check` passes. The members' standing operational notes are unchanged and remain the operational truth: the **status-enum→`status_def` migration** must run with a backfill + compatibility window with reporting queries updated in lockstep (docs-gate), and the owner→`work_assignment` backfill is one-time (ADR-0065); the backend gains a **scheduled due-soon/overdue evaluation + notification dispatcher** (ADR-0064) and a **recurrence materialiser that must be idempotent and survive missed runs** (catch-up policy, ADR-0070); workload/portfolio reads are heavy aggregates to back with indexed queries or materialized views (ADR-0069); large boards must virtualize/paginate (ADR-0066). Shipped slices are live and unchanged: the multi-view toggle + saved views (#344) and in-place form-intake editing (#639). Future PM decisions either amend a member (and update this dossier's synthesis + dependency web in the same PR) or, if net-new, are authored standalone and folded in at the next consolidation pass.

## Future considerations

- This dossier is vectorized into gold alongside other knowledge once stable (ADR-0090 future considerations; LocalPipeline).
- As the deferred member items land — reactions/rich-text in comments and the SharePoint-link attachment option (ADR-0064); unifying `onboarding_step` into `task` as a `kind`, required-field enforcement, custom-number rollup formulas, and tag merge/rename governance (ADR-0065); shared/team saved views (the server-side view object), calendar overlay/export, and timeline critical-path/auto-scheduling (ADR-0066); billable-time → proposal/invoice linkage, capacity-aware assignment suggestions, and OKR auto-progress (ADR-0069); template versioning/changelog, cloning a live project as a template, public/customer intake, and recurrence exceptions (ADR-0070) — they amend the relevant member and this dossier's synthesis + dependency web in the same PR.
- The **no-code rules / automation engine** that several members defer to (auto-complete-on-children, notification-generating rules, capacity-aware suggestions) remains a separately-scoped feature request; if adopted it gets its own ADR and is referenced, not absorbed.
- The same consolidation method (ADR-0090) applies to the remaining clusters.
