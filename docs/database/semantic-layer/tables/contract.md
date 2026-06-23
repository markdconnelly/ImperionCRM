---
type: Silver Table
title: contract
entity: contract
archetype: B
description: Managed-services contract — Autotask is the external system of record, fetched to silver; the commercial frame a delivery hangs off.
resource: ../../../decision-records/ADR-0044-silver-contracts-tickets.md
tags: [silver, service, contract, autotask]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# contract

The commercial agreement that frames an account's managed services — the recurring
contract, project block, or time-and-materials block a delivery and its tickets bill
against. Promoted from local-pipeline bronze (`autotask_contracts`) to first-class silver
the app reads (ADR-0018: the app reads silver). Governed by
[ADR-0044](../../../decision-records/ADR-0044-silver-contracts-tickets.md).

## Source of record / authority

**Autotask is authoritative** (`source = 'autotask'`, keyed by `external_ref`); the cloud
pipeline merges from bronze, idempotent on `(source, external_ref)`. Imperion does not own
contract state — it mirrors Autotask read-side. The `website` source is reserved for later
manual entries under the ADR-0039 precedence convention. The signature event that *creates*
a delivery is DocuSign-gated upstream (sale→delivery, ADR-0080/0081); this silver row is the
operational contract record, not the signing ceremony.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (nullable) |
| `name` | text | |
| `contract_number` | text | Autotask display number |
| `contract_type` / `category` | text | Autotask-native |
| `status` | text | Autotask-native lifecycle |
| `start_date` / `end_date` | date | term window |
| `estimated_revenue` / `estimated_hours` | numeric | block sizing |
| `sla_id` | text | service-level reference |
| `description` | text | |
| `source` | text | `autotask` (default) |
| `external_ref` | text | Autotask id; unique with `source` |
| `esign_status` | text? | CHECK `created` \| `sent` \| `delivered` \| `completed` \| `declined` \| `voided`. Denormalized mirror of the originating `esign_envelope.status` (ADR-0071) for fast read on a contract created from a signed proposal; NULL = not e-sign-originated. Autotask still owns `status`. |

## Joins

- `account_id` → `account`.
- Operationally related (not FK-enforced): `ticket` (work billed against the contract),
  `project` (delivery the contract funds), `opportunity` (the sale that produced it).
- `esign_envelope.contract_id` → this contract (ADR-0071): the envelope whose completion
  produced it. `esign_status` mirrors that envelope's status for fast read.

## Notes

Contract terms, revenue, and SLA references are commercially sensitive and
client-identifying — keep specifics out of this doc; resolve against the live read-only DB.
