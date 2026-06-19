---
type: Silver Table
title: task
entity: task
archetype: B
description: Single unified task model across sales/project/onboarding/general — website system of record.
resource: ../../../decision-records/ADR-0052-project-board-tasks-meetings-sales-activity.md
tags: [silver, delivery, task]
timestamp: 2026-06-15T18:00:00Z
---

# task

One task model for all work, categorized by `category`. Born silver — website system of
record. Governed by
[ADR-0052](../../../decision-records/ADR-0052-project-board-tasks-meetings-sales-activity.md)
(unified task) and
[ADR-0034](../../../decision-records/ADR-0034-onboarding-pm-and-task-categories.md)
(categories).

## Source of record / authority

**Website system of record.** A single table serves every context via `category`
(`sales` / `project` / `onboarding` / `general`). The JIT Autotask ticket dispatch is a
separate write-back sidecar (`task_ticket_fire`) — idempotent, backend-executed;
`autotask_ticket_ref` records the resulting external id.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `category` | enum | sales / project / onboarding / general |
| `title` / `detail` | text | |
| `status` | text | legacy label (open/in_progress/done); authoritative during the compatibility window |
| `status_def_id` | uuid | FK → `status_def` (configurable status, ADR-0065 B5); nullable, backfilled from `status` |
| `account_id` | uuid | FK → `account` (nullable) |
| `opportunity_id` | uuid | FK → `opportunity` (nullable) |
| `project_id` | uuid | FK → `project` (SET NULL) |
| `parent_task_id` | uuid | self-FK → `task` (ON DELETE CASCADE); subtask hierarchy (ADR-0065 B1) |
| `sprint_id` | uuid | FK → `sprint` (ON DELETE SET NULL); committed sprint, NULL = backlog (ADR-0069 D4, #349) |
| `ordinal` | integer | sibling order under a parent (ADR-0065 B1) |
| `owner_user_id` | uuid | FK → `app_user` |
| `due_at` | timestamptz | |
| `start_at` | date | task span start; calendar week view + timeline bars (ADR-0065/0066, #580) |
| `estimate` | numeric | per-task effort estimate, nullable (ADR-0069 D1, #346) |
| `estimate_unit` | text | unit of `estimate` (`hours`/`points`), configurable per project type (ADR-0069 D1, #346) |
| `autotask_ticket_ref` | text | set by the ticket-fire sidecar |

Logged time lives in the app-native `time_entry` table (one row per logged block:
`task_id`, `user_id`, `minutes`, `started_at?`, `note`, `billable`; ADR-0069 D1, #346) —
no concept file of its own (app-native operational state). Logged-vs-estimate remaining is
computed in the read layer (summed `minutes` vs `estimate`), never stored. Per-employee
weekly capacity lives in the app-native `user_capacity` table (`user_id`, `weekly_hours`;
ADR-0069 D2) — likewise no concept file.

## Joins

- `account_id` → `account`; `opportunity_id` → `opportunity`; `project_id` → `project`.
- `sprint_id` → `sprint` (ADR-0069 D4, #349): the iteration a task is committed to. A
  sprint's board is `task WHERE sprint_id = :sprint`; the backlog is `sprint_id IS NULL`.
  ON DELETE SET NULL — removing a sprint returns its tasks to the backlog. Closing a sprint
  reassigns its still-open tasks to the next planned sprint in scope (carry-over).
- `parent_task_id` → `task` (self-join): subtask hierarchy (ADR-0065 B1). Children read by
  `parent_task_id = :id` ordered by `ordinal`; the parent's n/m rollup is `count(*)` and
  `count(*) FILTER (status='done')` over its children. Arbitrary depth allowed; the list
  view filters to top-level (`parent_task_id IS NULL`).
- `task_ticket_fire` (the write-back sidecar → Autotask ticket queue).
- `status_def_id` → `status_def` (configurable status, ADR-0065 B5): the admin-definable
  status set per project type. `status_def.category` (todo/in_progress/done) is the
  reporting partition — rollups key off **category, not the label**. The legacy `status`
  text column stays authoritative during the compatibility window; the FK is backfilled
  from it via the seeded global default set (no data loss).

## Notes

Task titles/details can reference client work — keep specifics out of this doc; resolve
against the live read-only DB.
