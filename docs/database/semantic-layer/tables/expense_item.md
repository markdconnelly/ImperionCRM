---
type: Silver Table
title: expense_item
entity: expense_item
archetype: A
description: Unified employee expense surface — one row per source fact; out-of-pocket amount entered, mileage amount derived (miles × rate) by the backend.
resource: ../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md
tags: [silver, expense-tracking, reimbursement]
timestamp: 2026-06-17T00:00:00Z
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
- **Manual mileage** (`source = 'website'`, `kind = 'mileage'`; migration `0137`,
  #851) is the **v1 interim** while the MileIQ API is paywalled (→ v2). The employee
  enters miles by hand on their open report (`website_mileage` bronze); miles are
  authoritative, the dollar is derived the same way. Optional `ticket_ref` links an
  Autotask ticket (required when billable, GUI rule #853).
- **Reimbursable** and **billable** are independent legs: an item can be one,
  both, or neither. The billable leg carries the client via `autotask_company_id`.

## Bronze match / merge

A **union-by-fact** merge (cloud pipeline bronze→silver), mirroring
[`time_record`](time_record.md) — not a field-precedence collapse like
[`account`](account.md). The sources never contend for the same field. The
`source ↔ kind` pair is **constrained by CHECK** — `website` may be
`out_of_pocket` (out-of-pocket) **or** `mileage` (manual mileage, #851);
`mileiq` is `mileage`-only.

1. **Employee resolution.** A `website_expense_item` is already keyed to its employee
   (and its monthly `expense_report`). A `mileiq_drive` resolves to an `app_user`
   through the MileIQ user-id mapping (migration 0088); the silver merge also assigns
   the drive to a month's report (no report FK on the bronze drive).
2. **Mileage dollar is derived, not merged.** `miles` is MileIQ's bronze fact (non-comp);
   the reimbursement `amount` is **derived by the backend** (the comp reader) as
   `miles × effective Mileage Rate` and may be left NULL by the merge until stamped —
   the rate is comp data the pipelines may not read. Out-of-pocket `amount` is entered.
3. **No resurrection guard / no field recompute** — no contested field. `source_ref`
   keeps the originating bronze row id (idempotent re-merge).

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
- `source_ref` → bronze: `website_expense_item` (out-of-pocket, authoritative),
  `website_mileage` (manual miles authoritative, $ derived — #851), or `mileiq_drive`
  (MileIQ miles authoritative, $ derived). The `expense_item_all` view unions the
  three bronze sources side-by-side (read surface; silver is the true unification).
- `category_id` → `expense_category`; `receipt_id` → `receipt_attachment`.
- Feeds the monthly expense report flow (attest → admin-approve → finance-approve →
  Reimbursed) and the read-only QBO bill-payment match (ADR-0083).

## Notes

Receipts and merchant data are personal/sensitive — query the live read-only DB for
actuals; never inline row-level values, receipt contents, or client identifiers.
