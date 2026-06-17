---
type: Silver Table
title: ticket
description: Support/service ticket — Autotask is the external system of record, fetched to silver; provenance to the engagement that opened it.
resource: ../../../decision-records/ADR-0044-silver-contracts-tickets.md
tags: [silver, service, ticket, autotask]
timestamp: 2026-06-17T00:00:00Z
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

**SLA targets are Autotask-authored too** (#666): the typed SLA-target timestamps
(`sla_due_at` / `sla_first_response_due_at` / `sla_resolved_at`, mig 0128) are pulled from
Autotask (bronze `autotask_tickets.due_date_time` / `first_response_date_time` /
`resolved_date_time`), not computed here — Autotask remains the SoR for the SLA clock. The
`ticket_sla_breach` view's priority-keyed contract-term policy (ADR-0044) is now only the
**fallback** used where those columns are NULL.

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
| `sla_due_at` / `sla_first_response_due_at` / `sla_resolved_at` | timestamptz | Autotask SLA targets (mig 0128, #666); NULL until the pipeline merge populates them |
| `payload_bronze` | jsonb | lossless source payload |
| `summary_gold` | text | AI summary (backend-produced) |
| `source_assessment_id` / `source_sbr_id` | uuid | provenance |

## Joins

- `account_id` → `account`; `contact_id` → `contact`.
- Provenance: `assessment`, `strategic_business_review` (via `sbr_ticket`).

## Derived read-models

- **`ticket_sla_breach`** (view, migrations 0118 + 0128, ADR-0074 §2 / ADR-0044, #404/#666) —
  a read-model PROJECTION over this table that adds SLA breach state (first-response /
  resolution due timestamps, breached booleans, time-remaining, and an `sla_state` worklist
  bucket `breached|at_risk|ok|unknown`). **Not an authoritative `sla_state` store** — Autotask
  is the ticket SoR; the view recomputes on every read against the latest pulled silver, so
  the pipeline's normal ticket pull is its refresh. SLA due instants now **prefer the real
  Autotask targets** (`sla_due_at` / `sla_first_response_due_at`, mig 0128) and fall back to
  `opened_at` + a priority-keyed contract-term policy (joined to `contract.sla_id` for SLA
  applicability) only where those are NULL; `sla_resolved_at` sharpens the first-response
  breach proxy. The promote-to-COALESCE follow-up flagged in 0118 is now done (#666); the real
  columns stay NULL — and the view falls back to the derived policy with no behaviour change —
  until the pipeline `mergeTicketSources` change populates them (separate Pipeline repo issue).

## Notes

Ticket text carries client/operational detail — keep specifics out of this doc; resolve
against the live read-only DB.
