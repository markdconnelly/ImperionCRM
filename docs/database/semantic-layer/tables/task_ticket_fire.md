---
type: Silver Table
title: task_ticket_fire
entity: task_ticket_fire
archetype: D
description: Per-task write-back sidecar for JIT Autotask ticket creation — the front end requests a fire, the backend executor fires and stamps the id; idempotent, rolling-window.
resource: ../../../decision-records/ADR-0080-sale-to-delivery-orchestration.md
tags: [silver, delivery, ticket-fire, write-back, sidecar, archetype-d]
timestamp: 2026-06-19T00:00:00Z
---

# task_ticket_fire

The 1:1 **write-back sidecar** for a delivery `task`: it tracks the **just-in-time**
creation of an Autotask project-queue **Ticket** for that task. Governed by
[ADR-0080](../../../decision-records/ADR-0080-sale-to-delivery-orchestration.md) (§4/§7);
migration 0082. An action sidecar the orchestrator fires through
([ADR-0104](../../../decision-records/ADR-0104-okf-orchestrator-grounding-cortex.md)).

## Source of record / authority

**Front end requests; the backend executor performs the write** (ADR-0042). The board
reads state and *requests* a fire (sets `fire_state='scheduled'` / `scheduled_for`); the
backend executor fires (creates the Autotask Ticket linked via `ticket.projectID`) and
stamps the typed id. **Idempotency is the executor's, not the API's:** `idempotency_key`
(`imperioncrm-taskticket-{task_id}`) + `fire_state` are checked before any create. JIT by
design — the executor fires scheduled rows whose window has arrived (rolling window, never
all up front); `scheduled_for = NULL` means manual-only ("fire now"). **Autonomy:** runs
under the JIT ticket-fire executor's dial (ADR-0087).

## Schema

| Column | Type | Notes |
|---|---|---|
| `task_id` | uuid | PK — FK → `task` (ON DELETE CASCADE); 1:1 |
| `fire_state` | text | CHECK in `none` · `scheduled` · `fired` · `failed` (default `none`) |
| `scheduled_for` | timestamptz | when JIT firing should occur; NULL = manual-only |
| `autotask_ticket_id` | bigint | the created Ticket; NULL until fired (UNIQUE where not null) |
| `autotask_queue_id` | bigint | the queue it landed on (env config, stored per-row) |
| `idempotency_key` | text | NOT NULL UNIQUE — `imperioncrm-taskticket-{task_id}` |
| `fired_at` / `created_at` / `updated_at` | timestamptz | lifecycle stamps |
| `last_error` | text | last executor failure |

The executor's work queue is the partial index on `scheduled_for WHERE fire_state='scheduled'`.

## Joins

- `task_id` → `task` (the task whose ticket is fired). Sits alongside `project_provisioning`
  in the same sale→delivery executor flow; the fired Ticket joins `ticket` via `projectID`.
- **Consumed by** the backend ticket-fire executor (the actor) and the delivery board.

## Notes

No PII (delivery metadata + external ids). Resolve specific rows against the live read-only DB.
