---
type: Silver Table
title: defender_incident_ticket_link
entity: defender_incident_ticket_link
archetype: D
description: Write-back sidecar pairing a Defender incident to an Autotask ticket — the PK is the sync-back idempotency key (at most one ticket per incident, so creation never loops).
resource: ../../../decision-records/ADR-0059-defender-incident-autotask-ticket-linkage.md
tags: [silver, security, mssp, incident, write-back, sidecar, archetype-d]
timestamp: 2026-06-19T00:00:00Z
---

# defender_incident_ticket_link

The **write-back sidecar** pairing a Microsoft Defender **incident** to an Autotask
**ticket** — the SOC's detect→ticket seam. Governed by
[ADR-0059](../../../decision-records/ADR-0059-defender-incident-autotask-ticket-linkage.md);
migration 0076. An MSSP action sidecar the orchestrator fires through
([ADR-0104](../../../decision-records/ADR-0104-okf-orchestrator-grounding-cortex.md)).

## Source of record / authority

**Front end / executor requests; the backend performs the Autotask write** (ADR-0042). The
**composite PK `(tenant_id, incident_external_id)` IS the idempotency key**: at most one
ticket per incident per tenant, so ticket creation never loops. `origin` records which way
the pairing was made. **Per-tenant isolation is absolute** — every row is tagged with its
owning client tenant; no cross-tenant reads. **Autonomy:** the incident→ticket executor
runs under its dial (ADR-0087) — narrow auto (e.g. high-severity), else parks for a human.

## Schema

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | text | NOT NULL — owning client tenant; part of PK (isolation key) |
| `incident_external_id` | text | NOT NULL — the Defender incident id; part of PK (the idempotency key) |
| `autotask_ticket_external_id` | text | NOT NULL — the paired Autotask ticket (reverse-lookup indexed) |
| `origin` | text | CHECK in `defender_to_autotask` · `autotask_to_defender` · `manual` (default `manual`) |
| `linked_by` | text | who/what made the link |
| `note` | text | free-text context |
| `created_at` / `updated_at` | timestamptz | lifecycle stamps |

PRIMARY KEY `(tenant_id, incident_external_id)`.

## Joins

- Resolves to `defender_incidents` (by `tenant_id` + `incident_external_id`) and to the
  Autotask `ticket` (by `autotask_ticket_external_id`); ticket pages layer the Defender side
  in via the reverse index.
- **Consumed by** the backend incident→ticket executor (the actor) and the service-desk /
  security surfaces.

## Notes

Per-tenant security data; `tenant_id` is a client identifier — never inline tenant/incident
values, resolve against the live read-only DB. No secrets.
