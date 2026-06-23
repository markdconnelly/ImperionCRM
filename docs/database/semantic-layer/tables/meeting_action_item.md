---
type: Silver Table
title: meeting_action_item
entity: meeting_action_item
archetype: B
description: A follow-up action extracted from a meeting (1:1 anchored to the meeting's interaction), optionally promoted into a real board task. Website system of record.
resource: ../../../decision-records/ADR-0011-unified-interaction-timeline.md
tags: [silver, delivery, meeting, action-item, follow-up]
data_class: client_pii
timestamp: 2026-06-23T00:00:00Z
---

# meeting_action_item

A follow-up commitment extracted from a meeting — the "who owes what by when" captured
from a [`meeting`](meeting.md) (Teams Copilot recap or Plaud summary). Each action item is
anchored to the meeting's owning [`interaction`](interaction.md) (so it inherits the
contact/account links) and can be **promoted** into a real board [`task`](task.md) via
`source_task_id`. Born silver — website system of record; the items are derived from the
meeting's recap/summary. Governed by
[ADR-0011](../../../decision-records/ADR-0011-unified-interaction-timeline.md).

## Source of record / authority

**Website system of record, anchored to the interaction.** `interaction_id` is the meeting
this action came out of (FK → `interaction`, the timeline SoR — the meeting is 1:1 with
that interaction). `account_id` / `contact_id` denormalize the meeting's party for direct
filtering. `owner_user_id` is who owns the follow-up; `status` tracks whether it is done.
When an item is promoted to a tracked task, `source_task_id` links the resulting
[`task`](task.md) — the action item stays the meeting-side record, the task is the board
record, and the link keeps them in sync without duplicating the work.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `interaction_id` | uuid | FK → `interaction` (the meeting's owning interaction) |
| `account_id` | uuid | FK → `account` (denormalized meeting party; nullable) |
| `contact_id` | uuid | FK → `contact` (denormalized meeting party; nullable) |
| `owner_user_id` | uuid | FK → `app_user` — who owns the follow-up (nullable) |
| `description` | text | the action / commitment text |
| `status` | text | follow-up lifecycle state |
| `due_at` | date | when the action is due |
| `source_task_id` | uuid | FK → `task` — the board task this item was promoted into (nullable) |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `interaction_id` → [`interaction`](interaction.md): the meeting's timeline anchor;
  through it (and the 1:1 [`meeting`](meeting.md)) → `contact` / `account`.
- `account_id` → [`account`](account.md), `contact_id` → [`contact`](contact.md):
  denormalized party for direct filtering.
- `owner_user_id` → [`app_user`](app_user.md): the follow-up owner.
- `source_task_id` → [`task`](task.md): the board task a promoted item became.

## Notes

Action-item descriptions are extracted from meeting conversation and can carry client
content and identity — sensitive and client-identifying. Keep specifics out of this doc;
resolve against the live read-only DB (CLAUDE.md §8).
