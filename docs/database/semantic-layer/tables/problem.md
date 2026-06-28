---
type: Silver Table
title: problem
entity: problem
archetype: B
description: App-native ITIL 4 Problem Management record — the root-cause investigation behind one or more incidents, driven open→investigating→known_error→resolved, linking the primary contributing incident (silver ticket) and emitting a known_error on resolution.
resource: ../../../decision-records/ADR-0079-change-enablement.md
tags: [silver, service-desk, problem-management, itil, root-cause, archetype-b, app-native]
data_class: operational
timestamp: 2026-06-28T00:00:00Z
---

# problem

The app-native **Problem Management** record: the root-cause investigation that sits *behind*
one or more incidents. **Sage** (L3 / Problem-Mgmt, #1552) opens a problem, links the
contributing incident(s), drives it `open → investigating → known_error → resolved`, and on
resolution emits a [`known_error`](known_error.md) (the workaround + permanent fix a future
incident is matched against). It is the neighbour of [`change_request`](change_request.md) in
Change Enablement — Problem Management was **dropped** from #373 / ADR-0079 when only Change
shipped; this entity adds it back ([ADR-0079](../../../decision-records/ADR-0079-change-enablement.md)
amended, #1577, parent #373).

## Source of record / authority

**App-native — the website is the system of record** for the investigation (`problem:write`,
ADR-0045). A problem is NOT a bronze→silver merge: there is no external SoR for a root-cause
analysis. **Autotask remains the SoR for the incidents** the problem links (silver
[`ticket`](ticket.md), ADR-0044) — the problem references them, it does not own them. Backend-
executed (Sage's `investigate-problem` / `run-PIR` procedures); read-only to web for render.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (nullable — a problem may be estate-wide; ON DELETE SET NULL) |
| `ticket_id` | uuid | FK → `ticket` (the primary contributing incident; nullable for a proactive problem; ON DELETE SET NULL) |
| `title` | text | |
| `description` | text | |
| `status` | `problem_status` enum | `open` · `investigating` · `known_error` · `resolved` |
| `severity` | text | band: `low` · `medium` · `high` · `critical` |
| `root_cause` | text | the investigation output, populated as status advances |
| `opened_at` | timestamptz | when the problem was raised |
| `resolved_at` | timestamptz | set on `resolved`; CHECK `resolved_at >= opened_at` |

Indexed on `status`, `account_id`, `ticket_id`, `opened_at DESC`.

## Joins

- `account_id` → `account` — the owning client (nullable; estate-wide problems carry NULL).
- `ticket_id` → `ticket` — the primary contributing incident (the incident SoR, ADR-0044). A
  future `problem_incident` bridge carries the many-incidents set without reshaping this table.
- `known_error.problem_id` → `problem` — the known-error register a resolved problem emits.
- **Acting workflow:** Sage's `problem-investigation` tracer reads `problem` (and
  `known_error`) to create a problem, attach the incident, and emit a known error; `run-PIR`
  writes the post-incident review against the resolved problem.

## Notes

PII: none / operational. A problem carries a title/description, a status, a root-cause
narrative, and incident/ticket refs — it mints no personal data of its own. Investigation text
may carry client/operational detail — keep specifics out of this doc; resolve against the live
read-only DB. No secrets.
