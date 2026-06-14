---
type: Silver Table
title: expense_report
description: Monthly employee expense container — website system of record; drives idempotent Autotask ExpenseReport and the QBO reimbursement match.
resource: ../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md
tags: [silver, expense-tracking, reimbursement]
timestamp: 2026-06-14T00:00:00Z
---

# expense_report

The monthly container (one per `app_user × period_year × period_month`) that holds an
employee's expense items and drives approval and reimbursement. Born silver — website
system of record. Governed by
[ADR-0083](../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md).
The unified expense facts are in `expense_item`; see [`expense_item`](expense_item.md).

## Source of record / authority

**Website system of record.** State machine: `open` → `submitted` → `approved` →
`finance_approved` → `reimbursed` (or `rejected`). Admin approval writes one **idempotent
Autotask ExpenseReport** (the `autotask_expense_report` write-back sidecar). `reimbursed`
is matched **read-only** against a QuickBooks bill-payment (`qb_bill_payment_ref`).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `app_user_id` | uuid | FK → `app_user` |
| `period_year` / `period_month` | integer | monthly key (unique per employee) |
| `state` | text | open / submitted / approved / finance_approved / reimbursed / rejected |
| `attested_at` / `attested_by` / `attested_snapshot` | ts / uuid / jsonb | employee attestation |
| `approved_at` / `approved_by` | ts / uuid | admin approval |
| `finance_approved_at` / `finance_approved_by` | ts / uuid | finance approval |
| `reimbursed_at` / `qb_bill_payment_ref` | ts / text | read-only QBO match |
| `rejected_at` / `rejected_by` / `rejection_note` | ts / uuid / text | |

## Joins

- `app_user_id` → `app_user`. Items: `expense_item` (website out-of-pocket + MileIQ
  mileage). Write-back: `autotask_expense_report`. Reconciliation: `expense_reconciliation`
  (view). Unified close: `monthly_close` (view).

## Notes

Expense amounts, receipts, and approver identities are personal/financial data. Keep
row-level values out of this doc; resolve against the live read-only DB.
