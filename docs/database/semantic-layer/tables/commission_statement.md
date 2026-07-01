---
type: Silver Table
title: commission_statement
entity: commission_statement
archetype: C
description: Sales commission statement per plan × period — computed amounts then the approve → pay lifecycle; compute is auto, payout is always-gated, and paid is a record of the external payroll/QBO payout (never a payment instruction).
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, sales, finance, commission, statement, money-gate]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# commission_statement

The **commission statement** for a [commission_plan](commission_plan.md) × period:
`gross_commission` (tier rate × credited basis), `draw_applied` (recoverable-draw clawback),
`net_payable`, and the lifecycle
**`draft` → `computed` → `approved` → `paid`** (+ `void` = correction terminal state).
Archetype C (process-computed fact). #1650, epic #1534 (OP-02-C3, Stream 02: calculate sales
commissions & issue statements).

## Source of record / authority

**Backend-computed, human-gated, externally paid — the money-gate B6 split:**

- **`computed` is AUTO** — the backend compute procedure derives the statement from
  [commission_attainment](commission_attainment.md) + the plan tiers, ungated.
- **Payout is ALWAYS_GATE** — a human approves every statement (`approved_by` /
  `approved_at`) before anything pays; no autonomy-dial level ever auto-approves a payout
  (ADR-0128 ladder, `always_gate`).
- **`paid` is a RECORD, not a payment** — money moves in payroll/QBO (ADR-0123: QBO owns
  money movement; there is no app→QBO write path). `paid_ref` carries the external
  payroll-run / QBO transaction reference.

Backend has `SELECT/INSERT/UPDATE` (compute auto + the gate-executed approve/pay marks —
every process calls the backend, §1); web renders statements `SELECT`-only; **no role has
`DELETE`** (audit trail; corrections are `void`). One statement per (`plan_id`,
`period_start`, `period_end`); recompute updates the draft in place.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `plan_id` | uuid → `commission_plan` | |
| `attainment_id` | uuid → `commission_attainment` | the input the computation used (lineage; nullable for pure-rate plans) |
| `period_start` / `period_end` | date | statement period (`end >= start`) |
| `status` | enum `commission_statement_status` | `draft` · `computed` · `approved` · `paid` · `void` |
| `gross_commission` | numeric(14,2) | tier rate × credited basis |
| `draw_applied` | numeric(14,2) | recoverable draw clawed back this period (default 0) |
| `net_payable` | numeric(14,2) | gross − draw_applied |
| `currency` | text | default `USD` |
| `computed_at` | timestamptz | |
| `approved_by` / `approved_at` | uuid → `app_user` / timestamptz | the ALWAYS_GATE human approval |
| `paid_at` / `paid_ref` | timestamptz / text | record of the external payroll/QBO payout |
| `notes`, `created_at`, `updated_at` | | `updated_at` by trigger |

Unique: (`plan_id`, `period_start`, `period_end`).

## Joins

`plan_id` → [commission_plan](commission_plan.md); `attainment_id` →
[commission_attainment](commission_attainment.md); `approved_by` → [app_user](app_user.md).
The paid-side reconciliation against payroll/QBO facts is a read-model concern (by
`paid_ref`), never a stored FK into a finance mirror.

## Notes

**Compensation-sensitive financial data** (comp-gated) — per-rep pay amounts, RBAC-gated in
the GUI. No client PII, no secrets. The acting procedure ships **DORMANT** (ADR-0136 A5c);
this schema is propose-only substrate until it is activated.
