---
type: Silver Table
title: receipt_attachment
entity: receipt_attachment
archetype: B
description: Expense receipt blob reference plus its Autotask custody lifecycle — app-native SoR for the reference; Autotask is the durable store once verified.
resource: ../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md
tags: [silver, expense-tracking, receipt, attachment, autotask]
data_class: financial
timestamp: 2026-06-23T00:00:00Z
---

# receipt_attachment

The reference to an uploaded expense **receipt** plus the lifecycle that hands its custody
to Autotask. A receipt is uploaded on the website to a private Azure storage account; on
report approval the backend pushes it to Autotask as an `ExpenseItemAttachment` and verifies
it stored; the local pipeline then enforces a 90-day blob lifecycle. Born silver — app-native.
Governed by [ADR-0083](../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md)
(migration `0089`). Linked from an [`expense_item`](expense_item.md) via `receipt_id`.

## Source of record / authority

**App-native for the reference row; Autotask is the durable store once verified.** The row
tracks one receipt through a custody state: uploaded (blob in private storage) →
`pushed_at` (sent to Autotask, `autotask_attachment_id` stamped) → `verified_in_autotask`
(read-back confirmed) → `blob_deleted_at` (90-day lifecycle). The lifecycle delete is
**guarded**: a receipt that is *not yet* `verified_in_autotask` is retained/flagged, never
silently deleted — once verified, Autotask is the system of record for the binary and the
blob may be reclaimed. Mileage is receipt-exempt (rate-driven), so a mileage expense item
carries no receipt.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `app_user_id` | uuid | FK → `app_user` (ON DELETE CASCADE) — the uploading employee |
| `blob_path` | text | private storage-account path/key (not a public URL) |
| `content_hash` | text | integrity hash (e.g. sha256) for verify-stored |
| `content_type` / `byte_size` / `original_filename` | text / bigint / text | upload metadata |
| `autotask_attachment_id` | bigint | Autotask ExpenseItemAttachment id; NULL until pushed |
| `verified_in_autotask` | boolean | read-back confirmed — **gates** the blob delete |
| `uploaded_at` | timestamptz | when uploaded |
| `pushed_at` | timestamptz | when sent to Autotask |
| `verified_at` | timestamptz | when read-back confirmed |
| `blob_deleted_at` | timestamptz | 90-day lifecycle delete; only after verified |
| `created_at` / `updated_at` | timestamptz | `updated_at` trigger (`set_updated_at`) |

## Joins

- `app_user_id` → `app_user` (the employee).
- Referenced by [`expense_item`](expense_item.md)`.receipt_id` (and the out-of-pocket bronze
  `website_expense_item.receipt_id`) — a 0..1 receipt per item.
- The `missing_receipt` policy rule (`expense_policy_violation` view) is a hard violation when
  an out-of-pocket item has no `receipt_id`.

## Notes

Receipts are personal/financial documents and the blob path locates a private store — treat
both as sensitive. No receipt content, blob path, or storage identifier belongs in this doc;
resolve against the live read-only DB.
