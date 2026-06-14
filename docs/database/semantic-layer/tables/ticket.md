---
type: Silver Table
title: ticket
description: Support/service ticket — Autotask is the external system of record, fetched to silver; provenance to the engagement that opened it.
resource: ../../../decision-records/ADR-0044-silver-contracts-tickets.md
tags: [silver, service, ticket, autotask]
timestamp: 2026-06-14T00:00:00Z
---

# ticket

The service-desk ticket. **Autotask is the external system of record**; the pipeline
fetches it to silver (raw payload retained in `payload_bronze`, AI summary in
`summary_gold`). Governed by
[ADR-0044](../../../decision-records/ADR-0044-silver-contracts-tickets.md).

## Source of record / authority

**Autotask is authoritative** (`source = 'autotask'`, keyed by `external_ref`). Imperion
does not own ticket state — it mirrors Autotask read-side and records provenance for
tickets it caused (`source_assessment_id` / `source_sbr_id`). Tickets Imperion *fires*
originate from the `task_ticket_fire` / `defender_incident_ticket_link` write-back paths
(backend-executed, idempotent).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` |
| `contact_id` | uuid | FK → `contact` (nullable) |
| `source` | text | `autotask` |
| `external_ref` / `number` | text | Autotask id / display number |
| `title` / `description` / `resolution` | text | |
| `status` / `priority` / `category` / `queue` | text | Autotask-native |
| `ticket_type` / `sub_issue_type` | text | |
| `opened_at` / `closed_at` / `last_activity_at` | timestamptz | |
| `payload_bronze` | jsonb | lossless source payload |
| `summary_gold` | text | AI summary (backend-produced) |
| `source_assessment_id` / `source_sbr_id` | uuid | provenance |

## Joins

- `account_id` → `account`; `contact_id` → `contact`.
- Provenance: `assessment`, `strategic_business_review` (via `sbr_ticket`).

## Notes

Ticket text carries client/operational detail — keep specifics out of this doc; resolve
against the live read-only DB.
