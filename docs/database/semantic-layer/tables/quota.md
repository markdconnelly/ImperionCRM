---
type: Silver Table
title: quota
entity: quota
archetype: B
description: A revenue target for a sales owner or team over a period; the denominator of forecast attainment — website system of record.
resource: ../../../decision-records/ADR-0072-revenue-forecasting-model.md
tags: [silver, sales, forecast, quota, revenue]
timestamp: 2026-06-15T22:00:00Z
---

# quota

A revenue target for a sales **owner** or a **team** over a period (ADR-0072
decision 4, #381). It is the denominator of **attainment** = closed-won in the
period ÷ `amount`. Migration `0114`.

Born silver — website system of record; there is no external system that owns
quotas. Set by sales management on the forecast surface (#383).

## Source of record / authority

**Website system of record.** A website-native target object (like `project` /
`sprint`). Exactly one of `owner_user_id` / `team` is set — a quota is for a person
**or** a team, never both (`quota_owner_xor_team`). Revenue-sensitive: read is
RBAC-gated exactly like MRR (ADR-0030 — `canSeeRevenue`).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `owner_user_id` | uuid | FK → `app_user` (ON DELETE SET NULL) — the owner this quota is for; NULL when team-scoped |
| `team` | text | team label; NULL when owner-scoped |
| `period_start` / `period_end` | date | the quota window (`period_end ≥ period_start`) |
| `amount` | numeric | the target revenue for the period |
| `created_at` / `updated_at` | timestamptz | `updated_at` trigger |

## Joins

- `owner_user_id` → `app_user`: the owner; the same axis
  [`opportunity`](opportunity.md) forecast roll-ups group by — attainment compares a
  quota to the owner's closed-won deals in the overlapping period.
- `team` is a free-text label (no team table in v1); team rollups group by it.

## Notes

Quota targets are commercially sensitive but carry no client PII. Per-row amounts
resolve against the live read-only DB, not this doc. Attainment + the weighted /
categorised forecast are runtime computations in `lib/forecast.ts`, not stored here;
point-in-time history is [`forecast_snapshot`](forecast_snapshot.md).
