---
type: Silver Table
title: event
entity: event
archetype: B
description: A webinar or live event with a registration page and capacity, optionally auto-enrolling registrants into a marketing workflow. Website system of record.
resource: ../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md
tags: [silver, marketing, event, webinar, demand-gen, lead-response]
data_class: client_pii
timestamp: 2026-06-23T00:00:00Z
---

# event

A demand-generation **event** — a webinar or in-person live event — with a registration
page, schedule, capacity, and an optional marketing-workflow link that auto-enrolls
registrants. It is the object a [`campaign`](campaign.md) promotes (`campaign.event_id`)
and that [`event_registration`](event_registration.md) rows attach to. Born silver —
website system of record. Governed by
[ADR-0053](../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md).

## Source of record / authority

**Website system of record.** `kind` is `webinar` or `live_event`. `status` is the event
lifecycle. `registration_page` (jsonb, NOT NULL) holds the hosted registration form
definition. `capacity` caps registrations. `workflow_id` optionally links a marketing
[`workflow`](workflow.md) so registrants are auto-enrolled (nurture). The campaign side is
the promotion; the event side owns the schedule, page, and registration roll-up.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `kind` | enum `event_kind` | `webinar` · `live_event` |
| `name` | text | event title |
| `description` | text | optional |
| `status` | enum `event_status` | `draft` · `scheduled` · `live` · `completed` · `canceled` |
| `starts_at` / `ends_at` | timestamptz | event window (nullable while draft) |
| `timezone` | text | display timezone |
| `capacity` | integer | registration cap (nullable = uncapped) |
| `join_url` | text | webinar join link (nullable) |
| `location` | text | physical location for a live event (nullable) |
| `registration_page` | jsonb | hosted registration form definition (NOT NULL) |
| `workflow_id` | uuid | FK → `workflow` — auto-enroll registrants into a nurture journey (nullable) |
| `created_by_user_id` | uuid | FK → `app_user` |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- Children: [`event_registration`](event_registration.md) (`event_id` → here) — the
  registrants.
- `workflow_id` → [`workflow`](workflow.md): the nurture journey registrants auto-enroll
  into.
- Promoted by [`campaign`](campaign.md) (`campaign.event_id` → here).
- `created_by_user_id` → [`app_user`](app_user.md): the organizer.

## Notes

Event definitions are internal marketing content; registrant identity lives on
[`event_registration`](event_registration.md) / [`contact`](contact.md), not here. The
`join_url` is an event link, not a secret. Keep specifics out of this doc; resolve against
the live read-only DB (CLAUDE.md §8).
