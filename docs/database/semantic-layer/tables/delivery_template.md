---
type: Silver Table
title: delivery_template
description: Reusable delivery playbook (phases → tasks) instantiated into projects — website system of record.
resource: ../../../decision-records/ADR-0081-delivery-provisioning-template-model.md
tags: [silver, delivery, template]
timestamp: 2026-06-14T00:00:00Z
---

# delivery_template

A versioned, reusable delivery playbook: a template owns ordered phases
(`delivery_template_phase`), each owning tasks (`delivery_template_task`). Instantiating a
template builds a `project` + milestones + tasks (+ provisioning). Born silver — website
system of record. Governed by
[ADR-0081](../../../decision-records/ADR-0081-delivery-provisioning-template-model.md).

## Source of record / authority

**Website system of record.** `key` is the stable machine identity; `version` increments
as the playbook evolves. `project_type_id` filters which templates apply to a project
type. Inactive templates (`is_active = false`) are retained for history but not offered.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `key` | text | stable machine key |
| `name` / `description` | text | |
| `version` | integer | |
| `project_type_id` | uuid | FK → `project_type` |
| `is_active` | bool | |

## Joins

- `project_type_id` → `project_type`.
- Children: `delivery_template_phase` → `delivery_template_task`.
- Instantiation target: `project` (+ `project_milestone`, `task`, `project_provisioning`).

## Notes

Templates are internal playbook structure — no client data. Safe to describe fully here;
still no secrets.
