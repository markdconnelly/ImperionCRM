---
type: Silver Table
title: delivery_template_phase
entity: delivery_template_phase
archetype: B
description: An ordered phase under a delivery_template (the middle tier of the playbook tree) that instantiates into a project milestone. Website system of record.
resource: ../../../decision-records/ADR-0081-delivery-provisioning-template-model.md
tags: [silver, delivery, template, phase]
data_class: operational
timestamp: 2026-06-23T00:00:00Z
---

# delivery_template_phase

The middle tier of the [`delivery_template`](delivery_template.md) playbook tree: a
template owns ordered **phases**, each phase owns ordered
[`delivery_template_task`](delivery_template_task.md) rows. A phase carries the relative
schedule offset for the slice of work it groups; when a template is instantiated, each
phase becomes a [`project_milestone`](project_milestone.md) on the new
[`project`](project.md), with concrete dates derived from the project start plus the
phase's offset. Born silver — website system of record. Governed by
[ADR-0081](../../../decision-records/ADR-0081-delivery-provisioning-template-model.md).

## Source of record / authority

**Website system of record.** A phase belongs to exactly one template (`template_id`) and
is positioned by `ordinal` (UNIQUE per `(template_id, ordinal)`). `offset_days` /
`duration_days` are **relative** to the project start date, not absolute — the playbook is
date-agnostic until instantiated, so editing the template never moves dates on live
projects (instantiation is a snapshot, like `project_template`).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `template_id` | uuid | FK → `delivery_template` (ON DELETE CASCADE) |
| `ordinal` | integer | position among phases; UNIQUE `(template_id, ordinal)` |
| `name` | text | phase label (becomes the milestone name on instantiation) |
| `offset_days` | integer | start offset (days) relative to project start |
| `duration_days` | integer | planned span (days) |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `template_id` → [`delivery_template`](delivery_template.md) (ON DELETE CASCADE): the
  owning playbook; deleting a template removes its phases.
- Children: [`delivery_template_task`](delivery_template_task.md) (`phase_id` → here).
- Instantiation target: a phase becomes a [`project_milestone`](project_milestone.md) at
  delivery-template instantiation (a runtime copy, not a stored FK).

## Notes

Internal playbook structure — no client data. Safe to describe fully here; still no
secrets. Bounded by the template count.
