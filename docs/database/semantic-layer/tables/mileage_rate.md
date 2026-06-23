---
type: Reference / Config
title: mileage_rate
entity: mileage_rate
archetype: H
description: The effective-dated, system-wide mileage reimbursement rate (USD per mile) — comp-gated config beside pay_rate; the backend is the sole reader.
resource: ../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md
tags: [config, expense-tracking, mileage, comp, reference]
data_class: financial
timestamp: 2026-06-23T00:00:00Z
---

# mileage_rate

The effective-dated, **system-wide** reimbursement rate (USD per mile) used to derive the
dollar amount of a mileage expense. Unlike `pay_rate` (per-employee), the mileage rate is a
single system basis. Born silver — app-native config living in the **payroll-gated comp
store** beside `pay_rate`. Governed by
[ADR-0083](../../../decision-records/ADR-0083-employee-expense-tracking-and-reimbursement.md)
(migration `0088`). It is what turns a MileIQ drive's *miles* into a reimbursement amount on
[`expense_item`](expense_item.md).

## Source of record / authority

**App-native, system-wide, effective-dated; the backend is the sole reader.** A mileage
drive uses the rate in force on its date — the greatest `effective_from <= drive date` — so
the table is append-mostly (history preserved for back-period reconciliation). It defaults to
MileIQ's suggested rate (`source = mileiq_suggested`) and an admin may override on a system
basis (`source = system_override`). **Comp gating mirrors `pay_rate` exactly:** the website
exposes it only to finance/admin (the `canApprovePayroll` gate) and the backend reads it to
derive the mileage amount; it is **never** granted to either pipeline, the employee, agents,
or any client surface. The MileIQ-suggested rate snapshotted on the bronze drive is non-comp;
the authoritative system rate here is comp.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `effective_from` | date | inclusive, UNIQUE — one system rate per date; the rate in force = greatest `effective_from <= drive date` |
| `rate` | numeric(8,4) | USD per mile (e.g. `0.7000`) |
| `source` | text | `mileiq_suggested` \| `system_override` |
| `note` | text | rationale for the rate change |
| `created_at` | timestamptz | |
| `created_by` | uuid | FK → `app_user` (ON DELETE SET NULL) — who set the rate (audit) |

## Joins

- No FK in from silver entities — it is resolved by **date** at derivation time, not joined by
  key. The backend (the comp reader) applies it to a mileage `expense_item.miles` to compute
  `expense_item.amount`; the value is never hand-typed.
- Sits in the comp store beside `pay_rate` (migration `0085`) and `employee_profile`; the same
  RBAC ceiling governs both.

## Notes

The mileage rate is **compensation data** — the most restrictive class in the expense feature.
No rate value belongs in this doc, in issues/PRs, or in any pipeline-readable surface; resolve
the in-force rate against the live read-only DB under the finance/admin gate only.
