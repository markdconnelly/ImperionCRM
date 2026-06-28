---
type: Silver Table
title: rollback_plan
entity: rollback_plan
archetype: B
description: App-native change rollback artifact — a structured rollback plan attached to a change_request with its own draft→approved|rejected lifecycle; an approved plan is the precondition the change-intake workflow checks before approving a normal/emergency change.
resource: ../../../decision-records/ADR-0079-change-enablement.md
tags: [silver, service-desk, change-release, change-enablement, rollback, archetype-b, app-native]
data_class: operational
timestamp: 2026-06-28T00:00:00Z
---

# rollback_plan

The **change rollback artifact** — a structured rollback plan attached to a
[`change_request`](change_request.md). It carries its own approval lifecycle
(`draft → approved | rejected`), and an **approved** plan is the precondition **Marshall**
(Change→Release, #1553) requires before approving a normal/emergency change: no approved
rollback plan, no change approval. Stream 06 OP-05
([ADR-0079](../../../decision-records/ADR-0079-change-enablement.md), #1579, parent #373).

## Source of record / authority

**App-native — the website is the system of record** (`change:write`, ADR-0045). Not a
bronze→silver merge (the rollback plan is the company's own artifact). Authored on the /changes
surface, read + gated by Marshall's change-intake procedure (backend-executed); read-only to web
for render.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `change_request_id` | uuid | FK → `change_request` (the change this plan rolls back; ON DELETE CASCADE); UNIQUE — one plan per change |
| `steps` | text | the ordered rollback procedure |
| `approval_status` | `rollback_approval_status` enum | `draft` · `approved` · `rejected` |

Indexed on `change_request_id` and `approval_status`. UNIQUE `(change_request_id)`.

## Joins

- `change_request_id` → `change_request` (0135, ON DELETE CASCADE) — the change this plan backs;
  one plan per change (UNIQUE). Distinct from `change_request.approval_status` (the CHANGE's own
  approval): the rollback plan has a SEPARATE sign-off the change-intake gate reads.
- **Acting workflow:** Marshall's `change-intake` procedure requires + stores a rollback plan
  and checks its `approval_status = approved` before approving a normal/emergency change.

## Notes

PII: none / operational. A rollback plan is procedure text + an approval state tied to a change —
it mints no personal data. Plan steps may carry operational detail — keep specifics out of this
doc; resolve against the live read-only DB. No secrets.
