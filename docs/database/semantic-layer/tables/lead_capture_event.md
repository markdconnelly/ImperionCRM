---
type: Silver Table
title: lead_capture_event
entity: lead_capture_event
archetype: B
description: One raw inbound lead hit on a lead_hook — the verbatim payload plus its resolution to a contact/account and processing status. The funnel entry point for lead-response. Website system of record.
resource: ../../../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md
tags: [silver, marketing, lead, capture, demand-gen, lead-response]
data_class: client_pii
timestamp: 2026-06-23T00:00:00Z
---

# lead_capture_event

One inbound **lead hit** on a [`lead_hook`](lead_hook.md): the verbatim payload of a single
form submission / lead-ad fill / inbound message, plus its resolution to a
[`contact`](contact.md) (and [`account`](account.md)) and a processing `status`. It is the
funnel entry point the lead-response workflow acts on — a raw capture comes in, gets
resolved to a known or new contact, and triggers routing/nurture. Born silver — website
system of record; `payload_bronze` preserves the original lossless capture. Governed by
[ADR-0024](../../../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md).

## Source of record / authority

**Website system of record.** A capture belongs to the [`lead_hook`](lead_hook.md) it
arrived through (`hook_id`). `payload_bronze` (jsonb) is the **verbatim inbound payload** —
the lossless raw record of what was submitted, the bronze-grade source kept inline on this
silver row. Resolution sets `contact_id` / `account_id` once the lead is matched to (or
mints) a known entity; both are nullable while the capture is still unresolved. `status` is
the processing state (received → resolved → routed). The capture is the immutable record of
*what came in*; the resolved contact is the entity the rest of the system reasons over.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `hook_id` | uuid | FK → `lead_hook` (the endpoint it arrived through; nullable) |
| `payload_bronze` | jsonb | the verbatim inbound payload (lossless raw capture) |
| `contact_id` | uuid | FK → `contact` (resolved registrant; nullable until matched) |
| `account_id` | uuid | FK → `account` (resolved account; nullable) |
| `status` | text | processing state (received → resolved → routed) |
| `received_at` | timestamptz | when the hit arrived |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `hook_id` → [`lead_hook`](lead_hook.md): the capture endpoint.
- `contact_id` → [`contact`](contact.md), `account_id` → [`account`](account.md): the
  resolved entities.
- Referenced by [`event_registration`](event_registration.md) (`capture_event_id` → here)
  when the capture is an event signup.
- The lead-response ICM workflow reads new captures and drives resolution + routing.

## Notes

`payload_bronze` is **verbatim inbound lead data** — it can carry the submitter's personal
details (name, email, phone, free-text). Directly client-identifying. Never copy payload
contents into this doc, issues, or PRs; resolve specifics against the live read-only DB
(CLAUDE.md §8). Identity stays on [`contact`](contact.md) once resolved.
