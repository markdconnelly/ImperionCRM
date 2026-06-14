---
type: Silver Table
title: time_record
description: Unified employee time timeline — one row per source fact, website attendance authoritative, Autotask allocation corroborates.
resource: ../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md
tags: [silver, time-tracking, payroll]
timestamp: 2026-06-14T00:00:00Z
---

# time_record

One row per source fact on the employee time timeline. Two bronze sources merge
into it: manually entered website attendance and native Autotask allocations.
Governed by [ADR-0082](../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md);
migration `0086`.

## Source of record / authority

- **Website attendance is authoritative** for what hours an employee worked
  (`source = 'website'`, `kind = 'attendance'`).
- **Autotask allocation corroborates** how that time was booked against tickets
  (`source = 'autotask'`, `kind = 'allocation'`) — generally less total than
  attendance, and it does **not** override the website fact.
- The admin-approval step writes one **idempotent weekly Autotask Time Ticket** on
  the house company; the link is not a duplicate, so it does not double-count.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `app_user_id` | uuid | FK → `app_user` |
| `source` | text | `website` \| `autotask` |
| `kind` | text | `attendance` \| `allocation` |
| `work_date` | date | |
| `started_at` / `ended_at` | timestamptz | |
| `minutes` | integer | **derived** duration |
| `category` | text | `billable` \| `internal` \| `admin` (attendance only) |
| `ancillary_ticket_ref` | text | |
| `source_ref` | uuid | FK to the originating bronze row |
| `external_ref` | text | Autotask id (allocation rows) |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | trigger-maintained |

## Joins

- `app_user_id` → `app_user` (the employee).
- `source_ref` → the bronze row: `website_time_entry` (attendance, authoritative)
  or `autotask_time_entry` (allocation, corroborating).
- Feeds weekly Mon–Sun timesheets and the time/payroll reconciliations
  (time-deviation recon + expected-vs-QuickBooks payroll recon, ADR-0082).

## Notes

Comp/pay data is 1099-gated and stored separately; no PTO. Row-level entries are
personal data — query the live read-only DB for actuals, never inline them here.
