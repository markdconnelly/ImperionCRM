---
type: Reference / Config
title: employee_profile
entity: employee_profile
archetype: H
description: The employee HR core — 1:1 comp-sensitive sidecar on app_user carrying classification (1099|W2), hire/termination, and the external payroll/PSA mapping ids; paired with the effective-dated pay_rate.
resource: ../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md
tags: [silver, people, hr, comp, reference]
data_class: people_hr
timestamp: 2026-07-01T00:00:00Z
---

# employee_profile

The **employee HR core**: a deliberate 1:1 sidecar on [`app_user`](app_user.md) (the
Entra-mirrored identity, ADR-0016) that carries everything comp-sensitive about a person
as an *employee* — classification (`1099`|`W2`), hire/termination dates, job title, and
the external-id mappings that join the pay/time signals. Kept **off** the Entra-synced
`app_user` row on purpose (ADR-0082 §Security). Introduced by mig `0085`; HR core extended
by mig `0251` (#1621, W-2 payroll un-deferral). This file also covers its comp twin
**`pay_rate`** (the effective-dated compensation rate, same migration/ADR — there is no
separate concept file; a `pay_rate` DDL change updates this file).

**There is no separate `employee` table** — `employee_profile` IS the employee entity
(an employee is an `app_user` extended; a second table would be entity sprawl).

## Source of record / authority

**Imperion app-native** for the HR core (classification, dates, title) — the mapping UI /
HR flow writes it. The **external ids are mappings, not authority**: `autotask_resource_id`
(PSA time attribution), `quickbooks_vendor_id` (1099/AP payment match), and
`quickbooks_employee_id` (W-2 payroll match, mig `0251`) are resolved by the employee's
**email** — the consistent join key across systems — then stored for stability + audit.
`pay_rate` is app-native and **append-mostly**: a new row supersedes from its
`effective_from`; the reconcile picks the greatest `effective_from` ≤ the timesheet week
start; history is never overwritten.

## Schema

| Column | Type | Notes |
|---|---|---|
| `app_user_id` | uuid | PK, FK → `app_user` (`ON DELETE CASCADE`) — the 1:1 |
| `classification` | text | `1099` · `W2` — drives expected-pay math and which QBO record is authoritative (1099 = vendor/AP; W2 = payroll). Comp-sensitive |
| `autotask_resource_id` | bigint | mapping — Autotask Resource (time attribution); pipelines may read |
| `quickbooks_vendor_id` | text | mapping — QBO vendor (1099/AP payment match); pipelines may read |
| `quickbooks_employee_id` | text | mapping — QBO **Payroll employee** (W-2 statement match, mig 0251); pipelines may read |
| `hire_date` / `termination_date` | date | HR core (mig 0251); `termination_date` NULL while employed |
| `job_title` | text | HR core (mig 0251) |
| `mappings_resolved_at` / `mappings_confirmed_by` | ts / uuid | mapping audit |
| `is_active` | boolean | a former employee keeps history — deactivate, never delete |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**`pay_rate`** (companion, mig 0085): `app_user_id` FK → `app_user` · `effective_from`
(inclusive; `UNIQUE (app_user_id, effective_from)`) · `rate_kind` `hourly` · `salaried` ·
`hourly_rate` / `salaried_annual` numeric(12,2) · `overtime_multiplier` (FLSA 1.5x, W2) ·
`created_by` audit. The comp figure itself — the most-sensitive value in the system.

## Joins

- `app_user_id` → [`app_user`](app_user.md) (identity). Time: [`timesheet`](timesheet.md) /
  [`time_record`](time_record.md) attribute by `app_user_id`; Autotask time joins via
  `autotask_resource_id`. Pay: [`pay_statement`](pay_statement.md) joins the W-2 payroll
  mirror via `quickbooks_employee_id` (ingestion) → `app_user_id`; 1099 payment match joins
  `qbo_purchases` bronze via `quickbooks_vendor_id`. `pay_rate` is the expected-pay input to
  the payroll reconciliation read-model (`timesheet_payroll_status`, mig 0087 — hours only,
  NO rate in the view).

## Notes

**`people_hr` data class — staff PII + comp.** Classification, dates, and everything in
`pay_rate` are payroll-role-gated: web access is app-gated to finance/admin
(`canApprovePayroll`), backend reads for reconciliation only, pipelines get column-level
SELECT on the **mapping columns only** — never classification, never `pay_rate`. **Salary
non-disclosure is refusal-class** (Audrey guardrail): per-person rates are used in
reconciliation math, never disclosed. No row-level values here; resolve specifics against
the live read-only DB.
