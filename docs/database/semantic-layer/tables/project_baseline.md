---
type: Silver Table
title: project_baseline
description: Immutable snapshot of a project's planned dates (target go-live + task due dates) captured at a point in time, for planned-vs-actual slippage — website system of record.
resource: ../../../decision-records/ADR-0069-pm-planning-time-workload-goals-portfolio.md
tags: [silver, delivery, project, baseline, pm]
timestamp: 2026-06-15T20:00:00Z
---

# project_baseline

A point-in-time, **write-once** snapshot of a project's *planned* dates (ADR-0069 D6, #351):
the target go-live plus each task's due date, frozen as they stood at capture. It lets a
finished project be measured against the plan it committed to — planned-vs-actual slippage.

Born silver — website system of record; no external source. A project may be baselined more
than once (re-baseline after a scope change); **slippage is measured against the latest**.

## Source of record / authority

**Website system of record.** A website-native operational object (like `project` / `task`);
there is no external system that owns baselines. Created on demand from the project detail
surface (`captureProjectBaseline`). Never edited — there is no `updated_at` and no UPDATE path;
a new capture supersedes the prior one.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `project_id` | uuid | FK → `project` (ON DELETE CASCADE) — a project's baselines go with it |
| `captured_at` | timestamptz | when the snapshot was taken (the latest is the one slippage uses) |
| `planned_dates` | jsonb | frozen plan — `{ targetLiveDate, status, tasks:[{id,title,dueAt}] }` as the project/tasks stood at capture |
| `created_at` | timestamptz | insert time |

## Joins

- `project_id` → `project`: the baselined project. The latest baseline + the project's live
  `status`/`completed_at` give the project-level slippage (`actual − planned_go_live`).
- `planned_dates.tasks[].id` → `task.id` (a *frozen* reference, not an FK): the read layer
  joins the snapshot to the tasks' current `due_at` for per-task planned-vs-current slippage.
  A snapshotted task that was since deleted is reported as `exists: false` (slippage is
  computed in `getProjectSlippage`, not stored).

## Notes

Slippage (the #351 acceptance — a project completed two weeks late shows +14d vs baseline) is a
**runtime computation**, not schema: whole-day differences between the frozen plan and the live
completion/due dates. Baselines are internal delivery-planning objects — no client PII; task
titles may name client-facing work, kept out of this doc and resolved against the live
read-only DB.
