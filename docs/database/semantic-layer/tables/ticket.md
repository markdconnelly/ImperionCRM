---
type: Silver Table
title: ticket
description: Support/service ticket — Autotask is the external system of record, fetched to silver; provenance to the engagement that opened it.
resource: ../../../decision-records/ADR-0044-silver-contracts-tickets.md
tags: [silver, service, ticket, autotask]
timestamp: 2026-06-15T00:00:00Z
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

## Derived read-models

- **`ticket_sla_breach`** (view, migration 9001 placeholder, ADR-0074 §2 / ADR-0044, #404) —
  a read-model PROJECTION over this table that adds SLA breach state (first-response /
  resolution due timestamps, breached booleans, time-remaining, and an `sla_state` worklist
  bucket `breached|at_risk|ok|unknown`). **Not an authoritative `sla_state` store** — Autotask
  is the ticket SoR; the view recomputes on every read against the latest pulled silver, so
  the pipeline's normal ticket pull is its refresh. SLA targets are derived from `opened_at` +
  a priority-keyed contract-term policy (joined to `contract.sla_id` for SLA applicability),
  because the real Autotask SLA timestamps live only in bronze `autotask_tickets` (mig 0038)
  and are not yet promoted to typed columns here — a flagged follow-up (promote them, then
  `COALESCE(real, derived)`).

## Notes

Ticket text carries client/operational detail — keep specifics out of this doc; resolve
against the live read-only DB.
