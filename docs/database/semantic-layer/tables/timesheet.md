---
type: Silver Table
title: timesheet
entity: timesheet
archetype: B
description: Weekly Mon–Sun employee timesheet container — website system of record; drives the idempotent Autotask Time Ticket and payroll match.
resource: ../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md
tags: [silver, time-tracking, payroll]
timestamp: 2026-06-14T00:00:00Z
---

# timesheet

The weekly container (`week_start`..`week_end`, Mon–Sun) that holds an employee's
attendance and drives approval and payroll. Born silver — website system of record.
Governed by
[ADR-0082](../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md).
The unified time facts are in `time_record`; see [`time_record`](time_record.md).

## Source of record / authority

**Website system of record.** State machine: `open` → `submitted` → `approved` →
`payroll_approved` → `paid`. Admin approval writes one **idempotent weekly Autotask Time
Ticket** (the `time_ticket` write-back sidecar — backend-executed; the link is not a
duplicate, so no double-count). `paid` is matched **read-only** against QuickBooks
(`qb_payment_ref`); Imperion never writes payroll.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `app_user_id` | uuid | FK → `app_user` |
| `week_start` / `week_end` | date | Mon–Sun |
| `state` | text | open / submitted / approved / payroll_approved / paid |
| `attested_at` / `attested_by` / `attested_snapshot` | ts / uuid / jsonb | employee attestation |
| `approved_at` / `approved_by` | ts / uuid | admin approval |
| `payroll_approved_at` / `payroll_approved_by` | ts / uuid | CFO payroll approval |
| `paid_at` / `qb_payment_ref` | ts / text | read-only QB match |

## Joins

- `app_user_id` → `app_user`. Facts: `time_record` (website attendance + Autotask
  allocation). Write-back: `time_ticket` (→ Autotask). Reconciliations:
  `time_reconciliation_day`, `timesheet_payroll_status` (views).

## Notes

Hours and approval identities are personal/HR data; comp/pay is segregated (1099-gated
`pay_rate`, finance-only). Keep row-level values out of this doc; resolve against the live
read-only DB.
