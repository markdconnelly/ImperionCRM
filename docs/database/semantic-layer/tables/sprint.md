---
type: Silver Table
title: sprint
entity: sprint
archetype: B
description: Time-boxed iteration / backlog container that scopes a task board to a window of work — website system of record.
resource: ../../../decision-records/ADR-0069-pm-planning-time-workload-goals-portfolio.md
tags: [silver, delivery, sprint, pm]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# sprint

A time-boxed iteration that scopes a board to a fixed window of work (ADR-0069 D4, #349).
Born silver — website system of record; no external source. Tasks committed to a sprint
(`task.sprint_id`) form its board; tasks with no sprint are the **backlog**.

## Source of record / authority

**Website system of record.** A website-native operational object (like `project` /
`task`); there is no external system that owns sprints. `status` walks a small lifecycle
`planned → active → completed`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | sprint label, e.g. "Sprint 7" |
| `project_id` | uuid | FK → `project` (ON DELETE CASCADE); **NULLABLE** — NULL = a cross-project (team) sprint |
| `starts_at` / `ends_at` | date | planning window; both nullable (a sprint can be drafted before its dates) |
| `status` | text | `planned` / `active` / `completed` (CHECK-constrained) |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

## Joins

- `project_id` → `project`: the owning project, or NULL for a cross-project sprint.
- `task.sprint_id` → `sprint` (the inverse): a sprint's board is `task WHERE sprint_id =
  :sprint`; the backlog is `task WHERE sprint_id IS NULL`. **Carry-over** (the #349
  acceptance) is a runtime operation, not schema: closing a sprint sets `status='completed'`
  and reassigns its still-open tasks to the next `planned` sprint in the same scope
  (same `project_id`, NULL-safe), or to the backlog when none exists.

## Notes

Sprints are internal work-planning objects — no client PII. Sprint names can reference
client-facing delivery work; keep specifics out of this doc and resolve against the live
read-only DB.
