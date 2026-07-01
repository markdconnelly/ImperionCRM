---
type: Silver Table
title: pay_statement
entity: pay_statement
archetype: B
description: One employee's W-2 pay statement within a payroll_run — gross/net, provider-computed withholding, deductions, hours; read-only provider mirror keyed on (run, employee), the A9b no-double-pay key.
resource: ../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md
tags: [silver, people, payroll, comp, mirror]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# pay_statement

One employee's **W-2 pay statement** inside a [`payroll_run`](payroll_run.md): gross/net
pay, provider-computed employee/employer taxes, pre/post-tax deductions (+ per-line
`deduction_detail`), and hours. Read-only MIRROR of the external payroll provider
(archetype B), mig `0251` ([#1621](https://github.com/markdconnelly/ImperionCRM/issues/1621),
epic #1534). The **most-sensitive comp record in the system** — per-person pay.

## Source of record / authority

**The payroll provider is the external SoR** (see [`payroll_run`](payroll_run.md) — same
A9a rule: the provider computes statutory tax and moves the money; Imperion mirrors from
the provider read-back, never writes pay). **`UNIQUE (payroll_run_id, app_user_id)` is the
A9b idempotency key** (employee + pay period): a retried ingest or actuation read-back is a
no-op upsert, never a double-pay row. The **reconciliation** is a backend read-model, not
stored here: expected pay = approved hours (`timesheet_payroll_status`, mig 0087 — hours
only, no rate in the view) × the effective [`pay_rate`](employee_profile.md) vs the
statement `gross_pay`; only the verdict (matched / mismatch by amount) is ever reported —
never the per-person figures.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `payroll_run_id` | uuid | FK → `payroll_run` (`ON DELETE CASCADE`) |
| `app_user_id` | uuid | FK → `app_user` (`ON DELETE RESTRICT` — payroll history is a durable audit fact; identities deactivate, never hard-delete) |
| `external_id` | text | provider statement/paycheck id (read-back ref) |
| `gross_pay` / `net_pay` | numeric(12,2) | as reported |
| `employee_taxes` / `employer_taxes` | numeric(12,2) | provider-computed withholding |
| `pre_tax_deductions` / `post_tax_deductions` | numeric(12,2) | totals |
| `deduction_detail` | jsonb | per-line provider breakdown (benefits/withholding), mirrored as-is; comp-sensitive |
| `regular_hours` / `overtime_hours` / `pto_hours` | numeric(7,2) | as reported |
| `payment_method` | text | e.g. `direct_deposit` · `check` (mirrored as-is) |
| `currency` | text | default `USD` |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

## Joins

- `payroll_run_id` → [`payroll_run`](payroll_run.md) (the run). `app_user_id` →
  [`app_user`](app_user.md); ingestion matches the provider employee to the person via
  [`employee_profile`](employee_profile.md)`.quickbooks_employee_id` (W-2 mapping, mig
  0251). Reconciles against [`timesheet`](timesheet.md) hours × `pay_rate` (backend
  read-model).

## Notes

**`financial` data class (always-gate on the action plane) — per-person comp PII.**
RLS third-axis gated (mig 0251, `app_data_class_allowed('financial')` on web reads,
fail-closed); web + backend SELECT only, pipelines write the mirror. **Salary
non-disclosure is refusal-class** (Audrey guardrail): agents may use these figures in
reconciliation math but never disclose them — report verdicts, never per-person amounts;
comp values are never echoed to non-payroll context. ⚠ RLS/role design flagged for Mark
before prod apply. No row-level values here; resolve specifics against the live read-only
DB.
