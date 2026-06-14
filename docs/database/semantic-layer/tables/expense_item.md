---
type: Silver Table
title: expense_item
description: Unified employee expense surface — one row per source fact; out-of-pocket amount entered, mileage amount derived (miles × rate) by the backend.
resource: ../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md
tags: [silver, expense-tracking, reimbursement]
timestamp: 2026-06-14T00:00:00Z
---

# expense_item

One row per source fact on the employee expense surface. Mirrors the
[`time_record`](time_record.md) pattern. Written by the cloud pipeline bronze→silver
merge; the app and reconciliation read it. Governed by
[ADR-0083](../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md);
migration `0089` (not prod-applied — Mark-gated, #494).

## Source of record / authority

- **Website is authoritative for out-of-pocket** (`source = 'website'`,
  `kind = 'out_of_pocket'`); `amount` is entered.
- **MileIQ is authoritative for the MILES fact only** (`source = 'mileiq'`,
  `kind = 'mileage'`); the **dollar amount is Imperion's** — derived by the backend
  as `miles × effective Mileage Rate`, never hand-typed.
- **Reimbursable** and **billable** are independent legs: an item can be one,
  both, or neither. The billable leg carries the client via `autotask_company_id`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `app_user_id` | uuid | FK → `app_user` |
| `expense_report_id` | uuid | FK → `expense_report` (monthly) |
| `source` | text | `website` \| `mileiq` |
| `kind` | text | `out_of_pocket` \| `mileage` |
| `item_date` | date | |
| `category_id` | uuid | category (hard-linked to QBO, read-only) |
| `amount` | numeric(12,2) | entered (out-of-pocket) / **derived** (mileage) |
| `miles` | numeric(10,2) | mileage only |
| `reimbursable` | boolean | |
| `billable` | boolean | |
| `autotask_company_id` | bigint | client leg, when billable |
| `project_ref` / `ticket_ref` | text | |
| `merchant` | text | out-of-pocket only |
| `receipt_id` | uuid | upload → Autotask → 90-day blob delete |
| `source_ref` | uuid | FK to the originating bronze row |
| `external_ref` | text | `mileiq_drive_id` (mileage rows) |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | trigger-maintained |

## Joins

- `app_user_id` → `app_user`; `expense_report_id` → `expense_report`.
- `source_ref` → bronze: `website_expense_item` (out-of-pocket, authoritative) or
  `mileiq_drive` (miles authoritative, $ derived).
- Feeds the monthly expense report flow (attest → admin-approve → finance-approve →
  Reimbursed) and the read-only QBO bill-payment match (ADR-0083).

## Notes

Receipts and merchant data are personal/sensitive — query the live read-only DB for
actuals; never inline row-level values, receipt contents, or client identifiers.
