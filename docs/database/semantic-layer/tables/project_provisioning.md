---
type: Silver Table
title: project_provisioning
entity: project_provisioning
archetype: D
description: Write-back sidecar binding a native delivery project to its Autotask Project — DocuSign-gated, idempotent; the backend executor provisions, the front end only requests.
resource: ../../../decision-records/ADR-0080-sale-to-delivery-orchestration.md
tags: [silver, delivery, provisioning, write-back, sidecar, archetype-d]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# project_provisioning

The 1:1 **write-back sidecar** for a delivery `project`: it tracks the idempotent creation
of the matching **Autotask Project** and owns the provisioning gate. Governed by
[ADR-0080](../../../decision-records/ADR-0080-sale-to-delivery-orchestration.md) (§4) and
[ADR-0081](../../../decision-records/ADR-0081-delivery-provisioning-template-model.md)
(template model); migrations 0082/0084. This is where the orchestrator **acts**
([ADR-0104](../../../decision-records/ADR-0104-okf-orchestrator-grounding-cortex.md)).

## Source of record / authority

**Front end requests; the backend executor performs the write** (ADR-0042 boundary). The
web/board sets intent (creates the row, sets `contract_state`); the backend executor reads
the gated queue and creates the Autotask Project. **Two hard gates the executor honours:**
1. **Idempotency** — `idempotency_key` (`imperioncrm-project-{project_id}`) + `provision_state`
   are checked before every Autotask write (Autotask creates are non-idempotent).
2. **DocuSign gate** — it refuses to provision unless `contract_state = 'signed'`
   (ADR-0081 §3; set by DocuSign, ADR-0071; inert `'none'` until DocuSign is wired).

The executor's work queue is the partial index where `provision_state='pending' AND
contract_state='signed'`. **Autonomy:** the executor runs under the per-workflow autonomy
dial (provisioning executor; ADR-0087) — narrow auto, else parks.

## Schema

| Column | Type | Notes |
|---|---|---|
| `project_id` | uuid | PK — FK → `project` (ON DELETE CASCADE); 1:1 |
| `source_kqm_quote_id` | text | provenance: the won KQM quote that triggered provisioning |
| `autotask_opportunity_id` | bigint | the Autotask opportunity id the won quote carried (the won→Autotask seam, spike #427) |
| `autotask_project_id` | bigint | the created Autotask Project; NULL until created (UNIQUE where not null) |
| `provision_state` | text | CHECK in `pending` · `creating` · `created` · `failed` (default `pending`) |
| `contract_state` | text | the DocuSign gate — executor requires `signed` (`none` until wired) |
| `idempotency_key` | text | NOT NULL UNIQUE — `imperioncrm-project-{project_id}`; checked before any create |
| `provisioned_at` / `created_at` / `updated_at` | timestamptz | lifecycle stamps |
| `last_error` | text | last executor failure |

## Joins

- `project_id` → `project` (the provisioned subject). Pairs with `task_ticket_fire` (the
  per-task JIT fire sidecar) under the same delivery flow.
- **Consumed by** the backend provisioning executor (the actor) and the delivery board
  (reads state, requests fire/provision).

## Notes

No PII (provisioning metadata + external ids). External ids can be sensitive; resolve
specifics against the live read-only DB.
