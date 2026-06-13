# ADR-0065: PM task structure — hierarchy, dependencies, assignment, custom fields, statuses, tags

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0010 (single task model), ADR-0034 (milestones + R/Y/G health), ADR-0037 (onboarding playbook instantiation), ADR-0052 (project board, `task.project_id`), `docs/product/pm-feature-requirements.md` Theme B |

## Problem

The task model is flat and fixed: no subtasks, no dependencies, one optional owner,
hard-coded status enums, no custom fields, and only the `category` partition for
labelling. This blocks real task ergonomics and per-project-type configurability.

## Context

`task` is the single shared model for sales + delivery (ADR-0010). `onboarding_step`
is a separate, template-generated child-item under milestones (ADR-0034/0037).
`project_type` is already user-creatable (ADR-0052). Reporting currently keys off
the literal status strings.

## Options considered

1. **Extend `task` in place** (parent_task_id, dependency/assignment side tables,
   custom-field EAV, configurable `status_def`) — preserves the single model.
2. **Introduce a generic "item" object** decoupled from task/project — rejected:
   forks the data model, breaks the CRM↔delivery linkage and existing reporting.
3. **Unify `onboarding_step` into `task` now** — deferred: high blast radius on a
   live playbook; sequenced as a follow-up, not a precondition.

### Tradeoffs

Configurable statuses break reporting if it keys off labels → statuses carry a
`category` (todo/in-progress/done) and reporting keys off that. Custom-field EAV
(`*_value` jsonb) trades query ergonomics for flexibility; acceptable at internal
scale with GIN indexing.

## Decision

Extend the existing `task`/`project` model:

- **Subtasks (B1)** — `task.parent_task_id` (nullable self-FK) + `task.ordinal`.
  One level required in v1, arbitrary depth allowed. Parent shows n/m child rollup;
  auto-complete-on-children is manual in v1 (auto only via the out-of-scope rules
  engine). `onboarding_step` **coexists** for now; unifying steps as a task `kind`
  is a tracked follow-up (B1-F4 decision: coexist).
- **Dependencies (B2)** — `task_dependency{ predecessor_id, successor_id, type }`.
  Blocked items are flagged and warn on out-of-order start/close; not hard-blocked
  in v1. Circular-dependency detection required.
- **Assignment & watchers (B3)** — `work_assignment{ parent_type, parent_id,
  user_id, role: primary|assignee|watcher }`. Migrate existing
  `owner_user_id` → one `primary` row per item. Primary owner still drives status
  rollups and RBAC; assignees/watchers drive views and notifications (ADR-0064).
- **Custom fields (B4)** — `custom_field_def{ id, scope, key, label, type, config
  jsonb, project_type_id? }` + `custom_field_value{ field_id, parent_type,
  parent_id, value jsonb }`. Filterable/sortable; scoped per project_type.
- **Configurable statuses (B5)** — `status_def{ id, scope, project_type_id?, key,
  label, color, category(todo|in_progress|done), ordinal }`. Status columns become
  FK to `status_def`; a migration maps today's enum values to seeded default sets so
  **no data is lost** and reporting re-keys off `category`, not labels. Optional
  per-status WIP limits surface on the kanban board (ADR-0066).
- **Tags (B6)** — `tag{ id, label, color }` + `work_tag{ tag_id, parent_type,
  parent_id }`, distinct from `task.category` (which stays as the
  sales/project/onboarding/general partition).

## Consequences

- Tasks gain hierarchy, dependencies, multi-assignment, custom fields, configurable
  statuses, and tags without a parallel system; CRM↔delivery linkage preserved.
- Status FK migration is the highest-blast-radius change — run `graphify affected`
  on the data layer + every status consumer; gate behind seeded defaults so live
  data is untouched on deploy.

### Security impact

Custom fields can capture PII → same handling as any task field (NFR-3); field
definitions are an admin-permissioned action. Assignment/status changes are audited
(NFR-2). No new external surface.

### Cost impact

Negligible — schema + indexes only.

### Operational impact

Status-enum→`status_def` migration must run with a backfill and a compatibility
window; reporting queries updated in lockstep (docs-gate). Owner→assignment backfill
is one-time.

## Future considerations

Unify `onboarding_step` into `task` as a `kind`; required-field enforcement per
type (B4-F3); rollup formulas on custom number fields; tag merge/rename governance.
