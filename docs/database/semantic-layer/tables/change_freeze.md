---
type: Silver Table
title: change_freeze
entity: change_freeze
archetype: B
description: App-native change freeze-calendar window — a global or per-account period during which a change scheduled into the window is a hard always_gate block, turning 0135's informational schedule-conflict check into an enforced gate.
resource: ../../../decision-records/ADR-0079-change-enablement.md
tags: [silver, service-desk, change-release, change-enablement, freeze-calendar, archetype-b, app-native]
data_class: operational
timestamp: 2026-06-28T00:00:00Z
---

# change_freeze

The **change freeze-calendar** window — a period (global or per-account) during which changes
are blocked. A [`change_request`](change_request.md) whose schedule overlaps an **active**
freeze window is a hard `always_gate` block: **Marshall** (Change→Release, #1553) refuses to
proceed (today 0135's schedule-conflict detection in `change.ts` is informational-only — this
entity makes it an enforced gate). Stream 06 OP-09 ([ADR-0079](../../../decision-records/ADR-0079-change-enablement.md),
#1579, parent #373).

## Source of record / authority

**App-native — the website is the system of record** (`change:write`, ADR-0045). The freeze
calendar is the company's own governance data; there is no external SoR, so it is NOT a
bronze→silver merge. Authored on the /changes governance surface and read by Marshall's
change-intake procedure (backend-executed); read-only to web for render.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (NULL = a **global** freeze across every account; set = account-scoped; ON DELETE CASCADE) |
| `name` | text | the freeze label |
| `reason` | text | why the freeze is in place |
| `start_at` | timestamptz | window start |
| `end_at` | timestamptz | window end; CHECK `end_at >= start_at` |

Indexed on `(start_at, end_at)` (active-window lookup) and `account_id`.

## Joins

- `account_id` → `account` — the scoped client (NULL for a global freeze; ON DELETE CASCADE).
- Evaluated against `change_request.schedule_start` / `schedule_end` (0135) at intake — an
  overlap with an active window is the block. No FK (the join is a temporal overlap test, not a
  row reference).
- **Acting workflow:** Marshall's `change-intake` procedure reads `change_freeze` to block a
  change scheduled into an active window.

## Notes

PII: none / operational. A freeze window is governance metadata (label, reason, dates, optional
account scope) — it mints no personal data. No secrets.
