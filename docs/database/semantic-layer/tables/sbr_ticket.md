---
type: Silver Table
title: sbr_ticket
entity: sbr_ticket
archetype: B
description: Bridge linking an SBR to the period tickets it reviewed — references existing ticket history, never copies it.
resource: ../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md
tags: [silver, success, sbr, ticket, engagement]
data_class: client_pii
timestamp: 2026-06-23T00:00:00Z
---

# sbr_ticket

The bridge that records which existing tickets a
[`strategic_business_review`](strategic_business_review.md) considered for the period — a
pure reference set, never a copy of ticket data. It lets an SBR pull in the period's support
history (volume, themes, escalations) without duplicating the authoritative ticket record.
Born silver — website system of record. Governed by
[ADR-0022](../../../decision-records/ADR-0022-assessment-led-gtm-and-engagement-model.md)
(migration `0015`).

## Source of record / authority

**Website system of record for the link; the ticket itself stays authoritative on the
ticket.** This is a many-to-many bridge — `UNIQUE (sbr_id, ticket_id)` — between an SBR and
the tickets reviewed at it. It carries no ticket fields of its own: every ticket attribute is
read live from [`ticket`](ticket.md) (whose SoR is Autotask). Both sides CASCADE, so the link
disappears if either the SBR or the ticket is removed.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `sbr_id` | uuid | FK → `strategic_business_review` (ON DELETE CASCADE) — the owning SBR |
| `ticket_id` | uuid | FK → `ticket` (ON DELETE CASCADE) — the reviewed ticket |

> `UNIQUE (sbr_id, ticket_id)` — a ticket is linked to a given SBR at most once.

## Joins

- `sbr_id` → [`strategic_business_review`](strategic_business_review.md) (CASCADE).
- `ticket_id` → [`ticket`](ticket.md) (CASCADE) — the Autotask-SoR ticket; all ticket detail
  resolves there, never here.

## Notes

The link itself carries no client content, but it points at client support history. Resolve
ticket specifics against the live read-only DB, under the ticket's own access rules.
