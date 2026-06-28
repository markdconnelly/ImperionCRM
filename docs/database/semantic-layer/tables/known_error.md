---
type: Silver Table
title: known_error
entity: known_error
archetype: B
description: App-native known-error + workaround register emitted by a problem — the interim workaround and the eventual permanent fix that a future incident is matched against, the durable output of Problem Management.
resource: ../../../decision-records/ADR-0079-change-enablement.md
tags: [silver, service-desk, problem-management, known-error, workaround, archetype-b, app-native]
data_class: operational
timestamp: 2026-06-28T00:00:00Z
---

# known_error

The **known-error + workaround register** — the durable output of Problem Management. When a
[`problem`](problem.md) reaches `known_error` status (a workaround is found), Sage emits a
`known_error` row; the permanent fix is filled in on resolution. The value of the register is
deflection: a future incident is matched against it so the same root cause is **not
re-investigated** ([ADR-0079](../../../decision-records/ADR-0079-change-enablement.md) amended,
#1577, parent #373).

## Source of record / authority

**App-native — the website is the system of record** (`problem:write`, ADR-0045). Emitted and
maintained by Sage's `investigate-problem` / `run-PIR` procedures, backend-executed. Not a
bronze→silver merge (no external SoR). Read-only to web for render.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `problem_id` | uuid | FK → `problem` (the owning problem; ON DELETE CASCADE) |
| `title` | text | |
| `workaround` | text | the interim mitigation (set when the problem hits `known_error`) |
| `permanent_fix` | text | the resolution (set when the problem resolves) |

Indexed on `problem_id`.

## Joins

- `problem_id` → `problem` (ON DELETE CASCADE) — the owning root-cause investigation; a known
  error cannot outlive its problem.
- **Acting workflow:** Sage's `problem-investigation` tracer emits `known_error` from a problem
  in the `known_error` state; future incident triage matches against the register.

## Notes

PII: none / operational. A known error is a title + a workaround/fix narrative tied to a
problem — it mints no personal data. Workaround/fix text may carry operational detail — keep
specifics out of this doc; resolve against the live read-only DB. No secrets.
