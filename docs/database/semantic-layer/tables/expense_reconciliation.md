---
type: Silver Table
title: expense_reconciliation
entity: expense_reconciliation
archetype: F
description: Reimbursement Reconciliation verdict — matches an approved expense report's reimbursable total against the authoritative QuickBooks bill-payment.
resource: ../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md
tags: [silver, expense-tracking, reconciliation, reimbursement, qbo]
data_class: financial
timestamp: 2026-06-23T00:00:00Z
---

# expense_reconciliation

The backend-written verdict that closes the loop on reimbursement: it lines up an
approved [`expense_report`](expense_report.md)'s **reimbursable total** (the Imperion
expectation) against the **authoritative QuickBooks bill-payment** (read-only) and
records whether they match. Born silver — one row per report. Governed by
[ADR-0083](../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md)
(migration `0090`, §Reimbursement Reconciliation). The peer financial reconciliation is
the time side ([`time_record`](time_record.md) → payroll vs QBO).

## Source of record / authority

**Two sides, matched by the backend (the QuickBooks reader).** The **expected** side is
the app's own approved reimbursable total (`expected_reimbursable_total`, snapshotted from
`expense_item` at approval). The **actual** side is the QuickBooks bill-payment
(`qb_bill_payment_ref` / `qb_payment_amount`) — QuickBooks is authoritative, mirrored
read-only, never written. The **match rule** is employee + period + amount within a
configurable `tolerance`. A `matched` verdict sets the report `reimbursed`; a `mismatch`
**blocks** auto-reimbursement until a human resolves it (the deviation = the books and the
expectation disagree, surfaced in the monthly close). The reimbursement books as a
separate AP bill, distinct from the payroll wage.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `expense_report_id` | uuid | FK → `expense_report` (UNIQUE, ON DELETE CASCADE) — one verdict per report |
| `expected_reimbursable_total` | numeric(12,2) | snapshot of the approved reimbursable total (the expected side) |
| `qb_bill_payment_ref` | text | matched QuickBooks bill-payment id (read-only SoR) |
| `qb_payment_amount` | numeric(12,2) | the authoritative paid amount (the actual side) |
| `tolerance` | numeric(12,2) | configurable match tolerance, USD (default `0.01`) |
| `verdict` | text | `pending` \| `matched` \| `mismatch` |
| `reconciled_at` | timestamptz | when the verdict was set |
| `note` | text | resolution / exception narrative |
| `created_at` / `updated_at` | timestamptz | `updated_at` trigger (`set_updated_at`) |

## Joins

- `expense_report_id` → [`expense_report`](expense_report.md) (1:1). A `matched` verdict is
  what advances the report to `reimbursed` (and stamps `expense_report.qb_bill_payment_ref`).
- Rolls up into the `monthly_close` view (the unified time+expense finance surface) as
  `reimbursement_verdict`, alongside the time side's QBO match status.

## Notes

Reimbursement amounts and the matched QuickBooks payment are personal/financial data. Keep
row-level values and any payment identifiers out of this doc; resolve against the live
read-only DB.
