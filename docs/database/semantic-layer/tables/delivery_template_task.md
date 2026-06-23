---
type: Silver Table
title: delivery_template_task
entity: delivery_template_task
archetype: B
description: An ordered task under a delivery_template phase (the leaf tier of the playbook tree) that instantiates into a project task and may declare a just-in-time Autotask ticket dispatch. Website system of record.
resource: ../../../decision-records/ADR-0081-delivery-provisioning-template-model.md
tags: [silver, delivery, template, task, provisioning]
data_class: operational
timestamp: 2026-06-23T00:00:00Z
---

# delivery_template_task

The leaf tier of the [`delivery_template`](delivery_template.md) playbook tree: an ordered
task under a [`delivery_template_phase`](delivery_template_phase.md). Each task carries its
relative schedule and, optionally, a **ticket-dispatch declaration** — the template's
record that this step should fire an Autotask ticket just-in-time during delivery. On
instantiation a task becomes a [`task`](task.md) on the new [`project`](project.md); the
dispatch declaration is the source the [`task_ticket_fire`](task_ticket_fire.md) write-back
sidecar reads when the JIT executor fires the ticket. Born silver — website system of
record. Governed by
[ADR-0081](../../../decision-records/ADR-0081-delivery-provisioning-template-model.md).

## Source of record / authority

**Website system of record.** A task belongs to exactly one phase (`phase_id`) and is
positioned by `ordinal` (UNIQUE per `(phase_id, ordinal)`). `offset_days` / `duration_days`
are relative to the project start (date-agnostic until instantiated). The ticket fields are
**declaration only** — `dispatches_ticket` marks the step as ticket-firing and
`ticket_queue_id` / `ticket_title` / `ticket_lead_days` describe the ticket to raise; the
actual idempotent Autotask write is owned by the [`task_ticket_fire`](task_ticket_fire.md)
sidecar (front end requests, backend executor fires), never by this template row.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `phase_id` | uuid | FK → `delivery_template_phase` (ON DELETE CASCADE) |
| `ordinal` | integer | position among tasks; UNIQUE `(phase_id, ordinal)` |
| `title` | text | task label (becomes the project task title) |
| `offset_days` | integer | start offset (days) relative to project start |
| `duration_days` | integer | planned span (days) |
| `dispatches_ticket` | bool | true = this step fires a JIT Autotask ticket on instantiation/schedule |
| `ticket_queue_id` | bigint | target Autotask queue id (declaration; nullable) |
| `ticket_title` | text | ticket subject to raise (declaration; nullable) |
| `ticket_lead_days` | integer | how many days ahead of the task to fire the ticket |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `phase_id` → [`delivery_template_phase`](delivery_template_phase.md) (ON DELETE CASCADE):
  the owning phase; deleting a phase removes its tasks.
- Instantiation target: a task becomes a [`task`](task.md) at delivery-template
  instantiation (runtime copy, not a stored FK).
- Downstream consumer: a `dispatches_ticket=true` task is the declaration the
  [`task_ticket_fire`](task_ticket_fire.md) write-back sidecar reads to fire its idempotent
  Autotask ticket.

## Notes

Internal playbook structure — no client data; `ticket_title` may name client-facing work,
kept out of this doc and resolved against the live read-only DB (CLAUDE.md §8). No secrets.
