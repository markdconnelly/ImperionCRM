---
type: Silver Table
title: time_record
entity: time_record
archetype: A
description: Unified employee time timeline — one row per source fact, website attendance authoritative, Autotask allocation corroborates.
resource: ../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md
tags: [silver, time-tracking, payroll]
data_class: financial
timestamp: 2026-06-22T00:00:00Z
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

## Bronze match / merge

A **union-by-fact** merge (cloud pipeline bronze→silver), not a field-precedence
collapse like [`account`](account.md): the two sources never contend for the same
field, so each silver row keeps exactly one source's fact. The `source ↔ kind` pair
is **fixed by CHECK** — `website→attendance`, `autotask→allocation`.

1. **Employee resolution.** A `website_time_entry` is already keyed to its employee
   (via `timesheet`). An `autotask_time_entry` resolves to an `app_user` through the
   Autotask Resource mapping (migration 0085); until matched it stays unresolved and
   does not merge.
2. **Normalize.** `minutes` is **derived** — `ended_at − started_at` for attendance,
   `hours_worked × 60` for hours-only allocation rows. `source_ref` keeps the
   originating bronze row id (idempotent re-merge).
3. **No resurrection guard / no field recompute** — there is no contested field to
   recompute by precedence. Authority is positional: website attendance is the truth
   for hours worked; Autotask allocation is corroboration only and never overrides it.

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
