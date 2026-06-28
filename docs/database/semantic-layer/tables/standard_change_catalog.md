---
type: Silver Table
title: standard_change_catalog
entity: standard_change_catalog
archetype: B
description: App-native catalog of pre-authorized standard-change templates — a catalogued standard change whose auto_approve flag lets the change-intake workflow auto-approve it, while normal/emergency changes always park for approval.
resource: ../../../decision-records/ADR-0079-change-enablement.md
tags: [silver, service-desk, change-release, change-enablement, standard-change, archetype-b, app-native]
data_class: operational
timestamp: 2026-06-28T00:00:00Z
---

# standard_change_catalog

The **standard-change model catalog** — pre-authorized templates for low-risk, repeatable
changes. A catalogued standard change whose `auto_approve = true` lets **Marshall**
(Change→Release, #1553) **auto-approve** a matching change at intake, skipping the approval park;
normal and emergency changes always park for approval. Stream 06 OP-10
([ADR-0079](../../../decision-records/ADR-0079-change-enablement.md), #1579, parent #373) — the
ITIL `standard` change type already exists on [`change_request`](change_request.md) (0135); this
table is the *library* of pre-authorized models behind it.

## Source of record / authority

**App-native — the website is the system of record** (`change:write`, ADR-0045). The catalog is
the company's own change library; there is no external SoR, so it is NOT a bronze→silver merge.
Authored on the /changes governance surface, read by Marshall's change-intake procedure
(backend-executed); read-only to web for render.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (NULL = a **global** template across every account; set = account-scoped; ON DELETE CASCADE) |
| `name` | text | the template label |
| `definition` | text | the template body — scope, steps, validation |
| `risk_level` | text | band: `low` · `medium` · `high` |
| `auto_approve` | boolean | `true` = a matching standard change skips the approval park (default `false`) |

Indexed on `account_id`.

## Joins

- `account_id` → `account` — the scoped client (NULL for a global template; ON DELETE CASCADE).
- Matched against a `change_request` of `change_type = standard` (0135) at intake — the match is
  by template selection in the change-intake workflow, not a stored FK on `change_request`.
- **Acting workflow:** Marshall's `change-intake` procedure reads `standard_change_catalog` to
  auto-approve a catalogued (`auto_approve`) standard change while parking normal/emergency.

## Notes

PII: none / operational. A catalog entry is change-template metadata (name, definition, risk
band, auto-approve flag, optional account scope) — it mints no personal data. No secrets.
