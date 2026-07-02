---
type: Silver Table
title: commission_plan
entity: commission_plan
archetype: B
description: Human-authored sales comp plan per rep — base rate, rate tiers/accelerators (commission_plan_tier), and a recoverable/non-recoverable draw; effective-dated. The plan side that commission computation applies to attainment.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, sales, finance, commission, compensation]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# commission_plan (+ commission_plan_tier)

The **human-authored sales compensation plan** for a rep: a `base_rate` (fraction of the
`basis` — revenue · gross_margin · bookings), an optional periodic **draw** (recoverable =
advance clawed back from later statements; non-recoverable = guaranteed floor), and **rate
tiers / accelerators** in the child table `commission_plan_tier` (rate applied when period
attainment falls in `[attainment_min, attainment_max)`; a rate above base past 100%
attainment is an accelerator). Effective-dated (`effective_to IS NULL` = current). App-native
silver, archetype B (human-curated), the [budget](budget.md) pattern. #1650, epic #1534
(gap-fill OP-02-C3, Stream 02); framed by the
[data-and-automation doctrine](../../architecture/data-and-automation-doctrine.md).

## Source of record / authority

**Human-authored, app-native SoR.** The web comp-admin surface is the only write path
(ADR-0127 allowlist: web has `SELECT/INSERT/UPDATE`). The backend/agent runtime **reads the
plan and never authors compensation terms** (`SELECT` only). **No role has `DELETE`** — comp
records are an audit trail; a superseded plan is closed via `effective_to`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | plan label |
| `owner_user_id` | uuid → `app_user` | the rep on the plan (per-person; internal identity) |
| `basis` | enum `commission_basis` | `revenue` · `gross_margin` · `bookings` — what the rate applies to |
| `base_rate` | numeric(7,4) | rate as a fraction (0.0500 = 5%); used when no tier band matches |
| `draw_amount` / `draw_recoverable` | numeric(14,2) / boolean | periodic advance; recoverable = clawed back via `commission_statement.draw_applied` |
| `currency` | text | default `USD` |
| `effective_from` / `effective_to` | date | null `effective_to` = currently effective |
| `notes`, `created_at`, `updated_at` | | `updated_at` by trigger |

`commission_plan_tier` (child, `ON DELETE CASCADE`): `plan_id` → `commission_plan`,
`attainment_min` / `attainment_max` (fractions of quota; `max` NULL = unbounded),
`rate` (fraction). Unique on (`plan_id`, `attainment_min`).

## Joins

`owner_user_id` → [app_user](app_user.md). Read by the commission compute procedure together
with [quota](quota.md) and closed-won [opportunity](opportunity.md) rows to produce
[commission_attainment](commission_attainment.md) and
[commission_statement](commission_statement.md).

## Notes

**Compensation-sensitive financial data** (comp-gated, the `mileage_rate` posture) — per-employee
pay terms, RBAC-gated in the GUI. No client PII, no client identifiers, no secrets. Money-gate
B6 lives on the statement lifecycle, not here (a plan authors terms; it moves no money).
