---
type: Reference / Config
title: expense_category
entity: expense_category
archetype: H
description: The website-facing expense category, hard-linked to a QuickBooks chart-of-accounts account — the category system of record is QuickBooks.
resource: ../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md
tags: [config, expense-tracking, category, qbo, reference]
data_class: financial
timestamp: 2026-06-23T00:00:00Z
---

# expense_category

The clean, website-facing **category** an admin maps onto a QuickBooks account, carrying the
per-category caps, the billable default, the Autotask category id, and visibility. It is the
config an expense item is classified by. App-native config; the *category meaning* (the
chart of accounts) is owned by QuickBooks. Governed by
[ADR-0083](../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md)
(migration `0088`). Referenced by [`expense_item`](expense_item.md)`.category_id`.

## Source of record / authority

**QuickBooks is the category system of record; `expense_category` is the website-facing
mapping over it.** Each live category carries a **hard link** to a QuickBooks account
(`qbo_account_id` → the read-only bronze `qbo_expense_account`, populated by the local
pipeline's QuickBooks bulk pull — the app NEVER writes QuickBooks). The hard link is enforced
by a CHECK: a category may not go `is_active` while unmapped, **except** the system Mileage
category, which is rate-driven and mapping-exempt (`is_system = true`). Seed rows ship as
until-mapped, inactive placeholders; finance creates a missing account in QuickBooks manually
and the app re-syncs. The Autotask side (`autotask_expense_category_id`) is what the backend
stamps when writing the `ExpenseReport`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `key` | text | stable code, UNIQUE (e.g. `meals`, `mileage`) |
| `display_name` | text | website-facing label |
| `qbo_account_id` | text | FK → `qbo_expense_account.qbo_account_id` (ON DELETE RESTRICT) — the hard link to the QuickBooks account (SoR); NULL only for an until-mapped placeholder |
| `hard_cap` | numeric(12,2) | per-item cap; NULL = none (hard violation if exceeded) |
| `soft_threshold` | numeric(12,2) | per-item nudge; NULL = none (soft violation if exceeded) |
| `billable_default` | boolean | default billable leg for items in this category |
| `autotask_expense_category_id` | bigint | Autotask `ExpenseItem.ExpenseCategory` id (write-target stamp) |
| `is_system` | boolean | true = the Mileage category (rate-driven, mapping-exempt) |
| `is_user_visible` | boolean | shown in the employee picker |
| `is_active` | boolean | inactive-until-mapped (CHECK) |
| `mapped_by` | uuid | FK → `app_user` (ON DELETE SET NULL) — who mapped it (audit) |
| `created_at` / `updated_at` | timestamptz | `updated_at` trigger (`set_updated_at`) |

> CHECK `expense_category_active_requires_map`: `is_active = false OR is_system = true OR
> qbo_account_id IS NOT NULL` — a live category must be QuickBooks-mapped.

## Joins

- `qbo_account_id` → `qbo_expense_account` (bronze, QuickBooks chart of accounts — the
  category SoR, read-only sync; bronze never gets its own concept file).
- Referenced by [`expense_item`](expense_item.md)`.category_id` (and the out-of-pocket bronze
  `website_expense_item.category_id`).
- Drives the cap/threshold rules in the `expense_policy_violation` view (over_category_cap,
  over_soft_threshold, uncategorized).

## Notes

Caps, thresholds, and the QuickBooks/Autotask mapping are financial configuration, not client
PII, but the chart of accounts is sensitive — keep account names and ids out of this doc;
resolve against the live read-only DB.
