# ADR-0066: PM views — kanban board, calendar, timeline, multi-view

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0052 (project board), ADR-0034 (milestone health), ADR-0065 (configurable statuses / dependencies / start dates), `docs/product/pm-feature-requirements.md` Theme C |

## Problem

Projects and tasks render only as tables. There is no drag-drop kanban, no calendar,
no timeline/Gantt, and no way to switch one dataset between views. Status changes
require opening an edit form.

## Context

These are presentation-layer features over data the GUI already reads directly
(ADR-0042). Configurable statuses (ADR-0065 B5) define board columns; dependencies
(B2) and a new `task.start_at` feed the timeline. Render budget is ≤200 visible
items before virtualization (NFR-5).

## Options considered

1. **Build the view layer in-app** over existing repositories, with a shared
   filter/sort/group state reused across List/Board/Calendar/Timeline.
2. **Embed a third-party PM board widget** — rejected: data leaves the model, theming
   and RBAC mismatch, conflicts with the "no public API / self-contained" posture.

### Tradeoffs

A shared view-state layer is more up-front work than four standalone pages but is
what makes the multi-view toggle (C4) cheap and keeps filters consistent. Gantt with
critical-path is the heaviest; scoped as "could" and sequenced last.

## Decision

Build an in-app view layer, prioritised within the theme:

- **Kanban board (C1, v1)** — board for tasks and for projects; columns = status
  (`status_def`, else current enum). Drag persists the status change and emits a
  system event (ADR-0064 activity feed). Group-by selector (status default;
  assignee, project_type, tag); swimlanes and per-column WIP limits as SHOULD/COULD.
  Cards show assignee avatars, due date, tags, subtask progress, comment/attachment
  counts.
- **Calendar (C2, v2)** — month/week by due date (and `start_at` once added); drag to
  reschedule (audited); filter by assignee/project/type/tag.
- **Timeline / Gantt (C3, could)** — bars per task/milestone (`start_at`→due),
  dependency connectors (B2), milestone diamonds, optional critical-path. **Requires
  adding `task.start_at`** (also used by calendar). Reschedule suggests, never forces,
  dependent shifts.
- **Multi-view toggle (C4, v2)** — one dataset switchable List/Board/Calendar/Timeline
  without navigation; per-user saved filters/sort/group; shared/saved views later.
  **Shipped (#344):** the toggle + filter preservation are URL-state — switching
  List/Board/Calendar carries category/group/swimlane/tag along, so a view switch
  keeps the active filter set (the C4 acceptance). Per-user saved views are **named
  snapshots of that query string, persisted in localStorage** — this lane carries
  **no migration**, so saved views are client-side and private to the browser (cap
  20). Timeline is part of the toggle only once C3 lands (it needs `task.start_at`).
  **Shared/team saved views** need a server-side view object (a column/table) and
  stay a follow-up under *Future considerations*. Helpers: `src/lib/task-views.ts`
  (pure, tested); UI: `src/components/tasks/task-saved-views.tsx`.
- **Agile reporting (C5, later)** — burndown/velocity/cumulative-flow; depends on
  estimates (ADR-0069 D1) and sprints (D4); deferred with them.

## Consequences

- Staff get the board view they expect at go-live; later views reuse the same state
  layer and filters.
- `task.start_at` is a shared prerequisite for calendar drag-reschedule and timeline
  bars — add it once in the ADR-0065/0066 boundary migration.

### Security impact

Presentation only; all views honour existing RBAC reads (NFR-1). Drag actions go
through the same audited mutation path as the edit form (NFR-2). No new surface.

### Cost impact

None beyond client bundle size; virtualization keeps render cost bounded.

### Operational impact

Board drag writes are ordinary status mutations — no new backend process. Large
boards must virtualize/paginate (NFR-5).

## Future considerations

Saved/shared team views; calendar overlay/export (only if it does not imply the
excluded public API); critical-path and auto-scheduling on the timeline.
