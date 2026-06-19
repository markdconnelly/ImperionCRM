---
type: Silver Table
title: forecast_snapshot
entity: forecast_snapshot
archetype: C
description: A nightly point-in-time capture of the weighted + categorised forecast, closed-won, and quota per owner/period — for trend and forecast-accuracy. Website system of record (backend/pipeline job).
resource: ../../../decision-records/ADR-0072-revenue-forecasting-model.md
tags: [silver, sales, forecast, snapshot, revenue]
timestamp: 2026-06-15T22:00:00Z
---

# forecast_snapshot

A nightly, **point-in-time** capture of the forecast per owner/period (ADR-0072
decision 5, #381): the weighted total, the categorised bands, closed-won, and the
quota as they stood on `captured_on`. It powers the forecast-**over-time trend** and
**forecast-accuracy** — the call made N weeks ago compared to the eventual actual.
Migration `0114`.

Born silver — website system of record. The row is **derived** (a roll-up of
[`opportunity`](opportunity.md) forecast fields + [`quota`](quota.md)), like
[`project_baseline`](project_baseline.md) is a derived snapshot.

## Source of record / authority

**Website system of record, written by a process.** The backend/pipeline nightly
snapshot job (#382, ADR-0042 — a *process*, not the front end) computes the roll-up
and INSERTs one row per owner/period/day; the front end **reads** it for the trend
(#384). Idempotent per `(captured_on, owner|team, period)` (two partial-UNIQUE
indexes, owner-scoped and team-scoped) so a re-run of the job does not duplicate.
Revenue-sensitive — RBAC-gated (ADR-0030).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `captured_on` | date | the snapshot day (the trend's x-axis) |
| `owner_user_id` | uuid | FK → `app_user` (ON DELETE SET NULL); NULL when team-scoped |
| `team` | text | team label; NULL when owner-scoped |
| `period_start` / `period_end` | date | the forecast period this snapshot is for |
| `weighted` | numeric | Σ(`deal_value` × `win_probability`) over open deals at capture |
| `commit_total` / `best_case_total` / `pipeline_total` | numeric | categorised bands at capture |
| `closed_won` | numeric | realised revenue in the period at capture (the floor) |
| `quota` | numeric | the `quota.amount` in force at capture (nullable) |
| `created_at` | timestamptz | insert time |

## Joins

- `owner_user_id` → `app_user`: the owner the snapshot is for (matches the
  [`opportunity`](opportunity.md) / [`quota`](quota.md) owner axis).
- `(owner_user_id, period_start, period_end)` over `captured_on` is the trend series;
  the latest `captured_on` is the current call, older rows are the history accuracy
  measures against.

## Notes

Derived analytical history — no client PII (deal-level identity stays on
`opportunity`). Per-row amounts resolve against the live read-only DB. Bounded growth
(one row per owner/period/day); a prune policy is a future item (ADR-0072
consequences).
