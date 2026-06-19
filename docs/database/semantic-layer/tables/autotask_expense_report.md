---
type: Silver Table
title: autotask_expense_report
entity: autotask_expense_report
archetype: D
description: Write-back sidecar for the one idempotent monthly Autotask ExpenseReport per employee — front end requests, backend executor writes; re-approval updates the same report.
resource: ../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md
tags: [silver, finance, expense, write-back, sidecar, archetype-d]
timestamp: 2026-06-19T00:00:00Z
---

# autotask_expense_report

The 1:1 **write-back sidecar** for an `expense_report`: it tracks the one **idempotent
Autotask ExpenseReport** written per employee per month. Governed by
[ADR-0083](../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md)
(backend ADR-0044); migration 0090. An action sidecar in the Monthly-Close flow
([ADR-0104](../../../decision-records/ADR-0104-okf-orchestrator-grounding-cortex.md)).

## Source of record / authority

**Front end requests (admin-approve); the backend executor performs the Autotask write**
(ADR-0042). **Idempotency:** `idempotency_key` (`imperioncrm-expensereport-{expense_report_id}`)
+ `write_state` are checked before any write — re-approval **updates the same** report via the
stored `external_ref`, never a duplicate. `attachment_verified` records the read-back
verification that pushed receipts actually landed in Autotask. The executor's queue is the
partial index where `write_state IN ('pending','writing','failed')`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `expense_report_id` | uuid | NOT NULL UNIQUE — FK → `expense_report` (ON DELETE CASCADE); 1:1 |
| `app_user_id` | uuid | NOT NULL — FK → `app_user` (the Employee, denormalized) |
| `period_year` / `period_month` | integer | NOT NULL — the report's month |
| `external_ref` | bigint | Autotask ExpenseReport id; NULL until written |
| `write_state` | text | CHECK in `pending` · `writing` · `written` · `failed` (default `pending`) |
| `idempotency_key` | text | NOT NULL UNIQUE — `imperioncrm-expensereport-{expense_report_id}` |
| `attachment_verified` | boolean | default false — all pushed receipts read-back verified in Autotask |
| `last_pushed_at` / `written_at` / `created_at` / `updated_at` | timestamptz | lifecycle stamps |
| `last_error` | text | last executor failure |

## Joins

- `expense_report_id` → `expense_report` (the approved month); `app_user_id` → `app_user`
  (the employee). Feeds the `expense_reconciliation` (vs QBO) in Monthly Close; billable
  legs flow to client invoices (ADR-0083).
- **Consumed by** the backend ExpenseReport writer (the actor).

## Notes

Links an employee to monthly expense totals — workforce data, no client PII. Receipt
contents/amounts resolve against the live read-only DB.
