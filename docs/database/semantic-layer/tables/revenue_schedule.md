---
type: Silver Table
title: revenue_schedule
entity: revenue_schedule
archetype: B
description: ASC 606 step 5 — one row per performance obligation × period with the scheduled (recognizable) amount; recognition is the human CFO's always_gate act, recorded with the QBO journal reference for tie-out. Deferred-vs-recognized is derived, never persisted.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, finance, revenue-recognition, asc-606, rev-rec, deferred-revenue]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# revenue_schedule

The **per-period recognition row**: one row per
[performance_obligation](performance_obligation.md) × `period_start` (monthly-close grain,
ties 09-07) carrying the `scheduled_amount` Audrey computed as recognizable for that period.
Lifecycle **`scheduled` → `proposed` → `recognized` (| `held`)**: Audrey computes scheduled
rows and raises the period-close **proposed** packet (09-18, L2 propose-only);
**`recognized` is only ever reached through the human CFO's `always_gate`** (B6 money-gate —
a posted book entry is a binding act no agent performs), stamping `recognized_amount` /
`recognized_at` / `recognized_by`. Built for procedure 09-18 (#1619, epic #1534). App-native
silver (archetype B), `financial` data class.

## Source of record / authority

**OWN, not mirror** (see [performance_obligation](performance_obligation.md) — QBO holds no
ASC 606 sub-ledger). **QBO stays the system of record for the posted books** (ADR-0123):
the human posts the journal entry **in QBO**, and this row records `qbo_journal_ref` +
`reconciled_at` as the tie-out anchor — there is **no app→QBO write path**. The
deferred-revenue rollforward and the deferred-vs-recognized split are **derived read-models**
over these rows (allocated − recognized-to-date), never persisted (the ADR-0140 AR-aging
precedent).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `performance_obligation_id` | uuid | FK → `performance_obligation` (CASCADE; parent is RESTRICT-protected) |
| `period_start` / `period_end` | date | recognition period (CHECK end ≥ start); unique per obligation × `period_start` |
| `scheduled_amount` | numeric(14,2) | recognizable amount Audrey computed (≥ 0) |
| `recognized_amount` | numeric(14,2) | stamped by the human recognition (partial holds / true-ups may differ) |
| `status` | enum `revenue_schedule_status` | `scheduled` · `proposed` · `recognized` · `held` |
| `recognized_at` | timestamptz | CHECK: required (with amount) when `recognized` |
| `recognized_by` | uuid | FK → `app_user` — the HUMAN who recognized (CFO; never an agent) |
| `qbo_journal_ref` | text | the QBO journal entry the human posted (tie-out anchor; QBO=SoR) |
| `reconciled_at` | timestamptz | when tied out against QBO actuals |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | `updated_at` by trigger |

## Joins

- `performance_obligation_id` → [performance_obligation](performance_obligation.md) →
  [contract](contract.md).
- `recognized_by` → [app_user](app_user.md) (the human recognizer — the permanent autonomy
  floor of 09-18).
- Tie-out (by reference, not FK): `qbo_journal_ref` → the QBO journal entry (bronze QBO
  facts); reconciliation against QBO actuals is a read-model, mirroring the archetype-F
  verdict pattern.
- The CFO worklist = `status = 'proposed'` by period (partial index).

## Notes

No PII — obligation-level amounts and a recognizer reference only; no personal data beyond
the `app_user` id, no pay/comp data, no secrets. Grants (ADR-0127 least-priv): web `SELECT`
only (schedule + CFO cockpit render); backend/agent runtime `SELECT/INSERT/UPDATE` (computes
the schedule and records the human decision behind the B6 gate); **no DELETE for any role**.
No pipeline grants — nothing external mirrors into this table. Migration 0249 (placeholder;
claimed at merge).
