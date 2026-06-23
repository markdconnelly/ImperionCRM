---
type: Silver Table
title: project_milestone
entity: project_milestone
archetype: B
description: An ordered delivery milestone under a project — a roll-up gate with its own status and health. Website system of record.
resource: ../../../decision-records/ADR-0020-delivery-project-model.md
tags: [silver, delivery, project, milestone, pm]
data_class: operational
timestamp: 2026-06-23T00:00:00Z
---

# project_milestone

An ordered milestone under a [`project`](project.md): the phase-level grouping a
delivery board rolls tasks up into, with its own lifecycle `status` and a separate
RAG `health` signal. Milestones are instantiated when a project is created from a
[`project_template`](project_template.md) or [`delivery_template`](delivery_template.md),
and thereafter tracked on the project board. Born silver — website system of record.
Governed by [ADR-0020](../../../decision-records/ADR-0020-delivery-project-model.md) and
[ADR-0052](../../../decision-records/ADR-0052-project-board-tasks-meetings-sales-activity.md)
(one board across project types).

## Source of record / authority

**Website system of record.** A milestone belongs to exactly one project (`project_id`)
and is positioned among its siblings by `ordinal` (UNIQUE per `(project_id, ordinal)`).
`status` is the delivery lifecycle; `health` is an **orthogonal** RAG read of whether the
milestone is on track, set independently of status. `auto_check_key` is a stable machine
key that lets an automated check (a backend stage) flip a milestone's status without a
human — it names *which* automatic gate owns this milestone, not the gate's logic.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `project_id` | uuid | FK → `project` (the owning workstream) |
| `name` | text | milestone label |
| `ordinal` | integer | position among siblings; UNIQUE `(project_id, ordinal)` |
| `status` | enum `milestone_status` | `not_started` · `in_progress` · `blocked` · `complete` |
| `health` | enum `milestone_health` | `green` · `amber` · `red` — orthogonal on-track signal, independent of `status` |
| `auto_check_key` | text | stable key naming the automatic check that may own this milestone's status (nullable = human-driven) |
| `notes` | text | free text |
| `start_at` / `due_at` | date | planned window |
| `completed_at` | timestamptz | set when `status` reaches `complete` |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `project_id` → [`project`](project.md): the owning workstream; deleting/closing a
  project carries its milestones. The project board groups tasks under milestones.
- Children: [`task`](task.md) (a task may sit under a milestone) and
  [`onboarding_step`](onboarding_step.md) (`onboarding_step.milestone_id` → here).
- Instantiation source: [`project_template`](project_template.md) `template_item`
  rows of `kind='milestone'`, and [`delivery_template_phase`](delivery_template_phase.md),
  each become a `project_milestone` at project creation (a runtime copy, not a stored FK).

## Notes

Milestone names can carry client-facing delivery context — keep specifics out of this doc;
resolve against the live read-only DB (CLAUDE.md §8). No client PII of its own; bounded by
the project count.
