---
type: Silver Table
title: task
description: Single unified task model across sales/project/onboarding/general — website system of record.
resource: ../../../decision-records/ADR-0052-project-board-tasks-meetings-sales-activity.md
tags: [silver, delivery, task]
timestamp: 2026-06-14T00:00:00Z
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
| `status` | text | |
| `account_id` | uuid | FK → `account` (nullable) |
| `opportunity_id` | uuid | FK → `opportunity` (nullable) |
| `project_id` | uuid | FK → `project` (SET NULL) |
| `owner_user_id` | uuid | FK → `app_user` |
| `due_at` | timestamptz | |
| `autotask_ticket_ref` | text | set by the ticket-fire sidecar |

## Joins

- `account_id` → `account`; `opportunity_id` → `opportunity`; `project_id` → `project`.
- `task_ticket_fire` (the write-back sidecar → Autotask ticket queue).

## Notes

Task titles/details can reference client work — keep specifics out of this doc; resolve
against the live read-only DB.
