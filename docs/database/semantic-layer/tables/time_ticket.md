---
type: Silver Table
title: time_ticket
entity: time_ticket
archetype: D
description: Write-back sidecar for the one idempotent weekly Autotask Time Ticket per employee — front end requests, backend executor writes; re-approval updates the same ticket.
resource: ../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md
tags: [silver, finance, time, write-back, sidecar, archetype-d]
timestamp: 2026-06-19T00:00:00Z
---

# time_ticket

The 1:1 **write-back sidecar** for a weekly `timesheet`: it tracks the one **idempotent
Autotask Time Ticket** written per employee per week (on the house company, links ≠ dup so
no double-count). Governed by
[ADR-0082](../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md)
(backend ADR-0043); migration 0087. An action sidecar in the Monthly-Close flow
([ADR-0104](../../../decision-records/ADR-0104-okf-orchestrator-grounding-cortex.md)).

## Source of record / authority

**Front end requests (admin-approve); the backend executor performs the Autotask write**
(ADR-0042). **Idempotency:** `idempotency_key` (`imperioncrm-timeticket-{timesheet_id}`) +
`write_state` are checked before any write — re-approval **updates the same** ticket via the
stored `external_ref`, never a duplicate. `autotask_company_id`/`autotask_queue_id` are
backend config (recorded per-row for audit/repro, not secrets). The executor's queue is the
partial index where `write_state IN ('pending','writing','failed')`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `timesheet_id` | uuid | NOT NULL UNIQUE — FK → `timesheet` (ON DELETE CASCADE); 1:1 |
| `app_user_id` | uuid | NOT NULL — FK → `app_user` (the Employee, denormalized) |
| `week_start` | date | NOT NULL — convenience for the weekly query |
| `external_ref` | bigint | Autotask Time Ticket id; NULL until written |
| `write_state` | text | CHECK in `pending` · `writing` · `written` · `failed` (default `pending`) |
| `idempotency_key` | text | NOT NULL UNIQUE — `imperioncrm-timeticket-{timesheet_id}` |
| `autotask_company_id` / `autotask_queue_id` | bigint | house-company + queue (config, per-row for audit) |
| `written_at` / `created_at` / `updated_at` | timestamptz | lifecycle stamps |
| `last_error` | text | last executor failure |

## Joins

- `timesheet_id` → `timesheet` (the approved week); `app_user_id` → `app_user` (the employee).
  Feeds the `timesheet_payroll_status` reconciliation (vs QuickBooks) in Monthly Close.
- **Consumed by** the backend Time-Ticket writer (the actor).

## Notes

Links an employee to hours — `app_user_id` + week are workforce data; no client PII. Comp
specifics resolve against the live read-only DB; pay rates are comp-gated elsewhere.
