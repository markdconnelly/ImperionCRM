---
type: Silver Table
title: commission_attainment
entity: commission_attainment
archetype: C
description: Per-period attainment input for a commission plan — credited closed-won basis amount vs the quota in force, with the attainment fraction stored as-of computation so statement math is auditable.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, sales, finance, commission, attainment, quota]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# commission_attainment

The **attainment INPUT** to commission computation: one row per
[commission_plan](commission_plan.md) × period carrying the credited `actual_amount`
(closed-won [opportunity](opportunity.md) value in the period, per the plan's `basis`), the
`quota_amount` in force (from [quota](quota.md), mig 0114), and the derived `attainment`
fraction (1.0000 = 100%). **Persisted, not read-computed** — a statement's input must be
auditable exactly as it stood at computation time (the same as-of reasoning as
[forecast_snapshot](forecast_snapshot.md)). Archetype C (process-computed fact). #1650,
epic #1534 (OP-02-C3).

## Source of record / authority

**Backend-computed.** The commission compute procedure (backend/agent runtime) derives and
writes rows — this is the AUTO side of money-gate B6 (computation is ungated; payout is
always-gated on the statement). Backend has `SELECT/INSERT/UPDATE`; web renders it
`SELECT`-only; **no role has `DELETE`**. Pipelines are deliberately ungranted — nothing here
is fed by a bronze→silver merge; the inputs are silver facts (`opportunity`, `quota`).
Recompute upserts in place on the unique (`plan_id`, `period_start`, `period_end`) key
(idempotent).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `plan_id` | uuid → `commission_plan` | |
| `period_start` / `period_end` | date | the attainment period (`end >= start`) |
| `quota_amount` | numeric(14,2) | quota in force at computation; NULL = pure revenue-share plan (no quota → `attainment` NULL, base rate applies) |
| `actual_amount` | numeric(14,2) | credited closed-won basis amount in the period |
| `attainment` | numeric(7,4) | `actual / quota` as a fraction, stored as-of computation (tier-band selector) |
| `source` | text | provenance of `actual_amount`; default `pipeline` (closed-won opportunities) |
| `computed_at`, `created_at`, `updated_at` | timestamptz | `updated_at` by trigger |

Unique: (`plan_id`, `period_start`, `period_end`).

## Joins

`plan_id` → [commission_plan](commission_plan.md). Referenced by
[commission_statement](commission_statement.md).`attainment_id` (lineage: which input a
statement was computed from). Derived FROM [quota](quota.md) + closed-won
[opportunity](opportunity.md) inside the backend compute — by owner/period keys, not FKs.

## Notes

**Compensation-sensitive financial data** (comp-gated) — attainment vs quota is per-rep
performance. No client PII, no secrets. Acting procedure ships DORMANT (ADR-0136 A5c).
