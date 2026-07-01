---
type: Silver Table
title: payroll_run
entity: payroll_run
archetype: B
description: One external-provider W-2 pay run (period, pay date, run totals) — read-only mirror of the payroll provider (QBO Payroll / ADP-class); the app never computes tax or moves money.
resource: ../../../decision-records/ADR-0082-employee-time-tracking-and-payroll-reconciliation.md
tags: [silver, people, payroll, finance, mirror]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# payroll_run

One **W-2 pay run** at the external payroll provider: period (`period_start`..`period_end`),
`pay_date`, provider status, and run totals **as reported by the provider**. Read-only
MIRROR (archetype B — the [`invoice`](invoice.md) discipline), mig `0251`
([#1621](https://github.com/markdconnelly/ImperionCRM/issues/1621), epic #1534; un-defers
ADR-0082's dormant W-2 model). The persistence substrate for the 10-H11 *Run W-2 payroll*
procedure (Audrey money + Holly people inputs + human at the money gate). Per-employee
detail is the child [`pay_statement`](pay_statement.md).

## Source of record / authority

**The payroll provider (QBO Payroll / ADP-class) is the external SoR** — it computes
statutory tax/withholding and executes the pay movement; Imperion **mirrors and
reconciles, never owns** (10-H11 A9a; ADR-0123 finance read-only). There is **no app→
provider silver write path**: the 10-H11 propose/approve draft lives on the **action
plane** (`agent_pending_action` + the B6 MONEY GATE — `always_gate` class-1, dial-proof
forever), actuation submits to the *provider*, and this mirror is populated from the
provider **read-back** (A9c) by the ingestion plane. Idempotent upsert on
`(provider, external_id)`; when a provider exposes no run id, ingestion synthesizes a
deterministic key (`<pay_date>:<period_start>`). Totals are mirrored as-is, never
recomputed in-app.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `provider` | text | external SoR slug; `qbo_payroll` first (ADP-class is a data change) |
| `external_id` | text | provider run id (or deterministic synthesized key); `UNIQUE (provider, external_id)` = the upsert key |
| `period_start` / `period_end` | date | the pay period (`period_end >= period_start`) |
| `pay_date` | date | when pay moves |
| `run_type` | text | `regular` · `off_cycle` · `correction` |
| `status` | text | provider status mirrored as-is — no app lifecycle |
| `total_gross` / `total_net` | numeric(14,2) | run totals as reported |
| `total_employee_taxes` / `total_employer_taxes` / `total_deductions` | numeric(14,2) | provider-computed |
| `currency` | text | default `USD` |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

## Joins

- Children: [`pay_statement`](pay_statement.md) rows (`payroll_run_id`, CASCADE) — one per
  employee in the run. The 10-H11 draft view (total $ + headcount + period-over-period
  diff) is a derived read-model over this table + its statements, not stored.

## Notes

**`financial` data class (always-gate on the action plane)** — payroll money. First
class-literal **RLS** silver table (mig 0251): web reads pass only for roles granted
`financial` (`app_data_class_allowed`, 0175 — finance/admin), fail-closed; pipelines write
the mirror and the backend reads for reconciliation as process identities. ⚠ RLS/role
design flagged for Mark before prod apply. No pay values appear in this doc; resolve
specifics against the live read-only DB.
