---
type: Silver Table
title: event_registration
entity: event_registration
archetype: B
description: One person's registration for an event — links the resolved contact and the originating lead-capture event, with attendance (checked-in) state. Website system of record.
resource: ../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md
tags: [silver, marketing, event, registration, demand-gen, lead-response]
data_class: client_pii
timestamp: 2026-06-23T00:00:00Z
---

# event_registration

One person's registration for an [`event`](event.md): the record that someone signed up,
which [`contact`](contact.md) they resolved to, the [`lead_capture_event`](lead_capture_event.md)
the signup arrived through, and whether they actually attended (`checked_in_at`). It is the
bridge between the demand-gen funnel (a form submission → a lead) and the event roster. Born
silver — website system of record. Governed by
[ADR-0053](../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md).

## Source of record / authority

**Website system of record.** A registration belongs to one event (`event_id`). The
registrant resolves to a `contact_id` once identity is matched (nullable until resolved —
an anonymous signup can exist before contact resolution). `capture_event_id` links the
originating [`lead_capture_event`](lead_capture_event.md) — the raw form/hook hit that
produced this registration, preserving provenance from inbound funnel to roster. `status`
is the registration state; `checked_in_at` records attendance (the "showed up" signal that
distinguishes a registrant from an attendee). `source` records how the registration came
in.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | FK → `event` (the event registered for) |
| `contact_id` | uuid | FK → `contact` (the resolved registrant; nullable until matched) |
| `capture_event_id` | uuid | FK → `lead_capture_event` (the originating funnel hit; nullable) |
| `status` | text | registration lifecycle state |
| `source` | text | how the registration arrived (nullable) |
| `registered_at` | timestamptz | when they signed up |
| `checked_in_at` | timestamptz | attendance — set when they actually attended (nullable) |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `event_id` → [`event`](event.md): the event; the roster reads all registrations for an
  event.
- `contact_id` → [`contact`](contact.md): the resolved registrant.
- `capture_event_id` → [`lead_capture_event`](lead_capture_event.md): the inbound funnel
  provenance.

## Notes

A registration ties a person to an event — directly client-identifying (and the
attendance signal is personal data). Keep specific registrants out of this doc; resolve
against the live read-only DB (CLAUDE.md §8). Identity stays on [`contact`](contact.md).
