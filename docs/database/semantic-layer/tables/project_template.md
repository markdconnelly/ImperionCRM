---
type: Silver Table
title: project_template
entity: project_template
archetype: B
description: Admin-editable project playbook (milestones + steps/tasks, kept in template_item) instantiated as a snapshot onto new projects — website system of record.
resource: ../../../decision-records/ADR-0070-pm-templates-recurrence-intake.md
tags: [silver, delivery, project, template, pm]
timestamp: 2026-06-16T16:00:00Z
---

# project_template

A reusable, admin-editable **project playbook** (ADR-0070 E1, #352): a named set of milestones
and their child steps/tasks that a new project can be created from. Generalises the hard-coded
onboarding playbook so admins can define their own delivery playbooks (e.g. an "Implementation"
template with four milestones).

The tree lives in the companion **`template_item`** table (one row per milestone/step/task,
`parent_id` self-FK, `payload` jsonb). Applying a template is a **snapshot**: items are copied
onto the new project at instantiation, so later edits to the template never retro-mutate live
projects.

Born silver — website system of record; no external source.

## Source of record / authority

**Website system of record.** A website-native authoring object (like `project` / `task` /
`delivery_template`); no external system owns it. The seeded **Standard MSP Onboarding** row is
`is_protected = true` and carries **no `template_item` rows** — its instantiation delegates to
the hard-coded onboarding playbook (`lib/onboarding-template.ts`, ADR-0037), so there is no
behaviour change and no duplicated playbook to drift. Protected templates cannot be deleted.

Distinct from **`delivery_template`** (ADR-0081), the sale→delivery provisioning playbook with
Autotask ticket-dispatch — `project_template` is the general PM-parity template for any project.

## Schema

`project_template`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `key` | text | UNIQUE, slugified from the name |
| `name` | text | display name |
| `description` | text | optional |
| `project_type_id` | uuid | FK → `project_type` (ON DELETE SET NULL); NULL = any type |
| `is_protected` | boolean | seeded built-in (the onboarding default) — undeletable |
| `created_at` / `updated_at` | timestamptz | `updated_at` maintained by trigger |

`template_item` (the tree):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `template_id` | uuid | FK → `project_template` (ON DELETE CASCADE) |
| `parent_id` | uuid | self-FK (ADR-0070 `parent_ref`): NULL for a milestone; the milestone's id for a step/task |
| `kind` | text | CHECK `milestone` \| `step` \| `task` |
| `ordinal` | integer | position among siblings |
| `payload` | jsonb | snapshot fields — `{ name \| title, offsetDays, durationDays }` |

## Joins

- `project_template.project_type_id` → `project_type`: optional binding used to filter the picker.
- `template_item.template_id` → `project_template`; `template_item.parent_id` → `template_item`
  (a milestone owns its step/task children).
- At instantiation (`instantiateProjectTemplate`, runtime, not a stored FK): each milestone item
  becomes a `project_milestone`; each step/task becomes a `task` (category `project`) on the new
  project, with dates derived from the project start + the payload offsets.

## Notes

The snapshot/instantiate is a **runtime operation**, not schema. `payload` is jsonb so checklist
subtasks (ADR-0070 E1-F3) ride here without a migration. **Task checklist templates (E1-F3, #633)
reuse this table:** a checklist template is a `project_template` row whose `key` carries the
`checklist:` prefix, with flat `template_item` rows (`kind='task'`, `parent_id` NULL,
`payload={title}`); applying one instantiates those items as subtasks under a target task
(`applyChecklistTemplateToTask`, runtime). The list/get accessors filter on the `checklist:`
prefix so checklist templates and project playbooks never appear in each other's pickers.
Templates are internal authoring objects — no client PII; item titles may name client-facing
work, kept out of this doc and resolved against the live read-only DB.
