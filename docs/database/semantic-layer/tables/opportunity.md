---
type: Silver Table
title: opportunity
description: Merged silver opportunity from three bronze sources (KQM quote header, Autotask, website manual); the object the app uses.
resource: ../../../decision-records/ADR-0080-sale-to-delivery-orchestration.md
tags: [silver, sales, opportunity, kqm, autotask]
timestamp: 2026-06-14T00:00:00Z
---

# opportunity

The silver opportunity the app reasons over, merged from three bronze sources that
each contribute unique fields. Governed by
[ADR-0080](../../../decision-records/ADR-0080-sale-to-delivery-orchestration.md);
migration `0083` (union view `opportunity_bronze_all`).

## Source of record / authority

Three bronze sources merge; **precedence is `website` > `autotask` > `kqm`**.
The KQM `autotask_*` ids are the **cross-source join keys** — `autotask_opportunity_id`
joins the sources together.

- **KQM** (`kqm_opportunities`) — quote header; KQM is the quote system of record
  (read-only, native CPQ gutted per the sale→delivery pivot).
- **Autotask** (`autotask_opportunities`) — the Autotask Opportunity entity.
- **Website** (`website_opportunities`) — manual sales-team entry, highest
  precedence (a human override wins).

## Bronze union (shape)

`opportunity_bronze_all` unions the three sources with a `source` discriminator and
the shared join keys:

| Field | From | Notes |
|---|---|---|
| `source` | all | `kqm` \| `autotask` \| `website` |
| `external_id` | all | per-source id |
| `title` | all | |
| `status_raw` | all | source-native status string |
| `autotask_opportunity_id` | kqm/autotask | **cross-source join key** |
| `account_external_ref` | kqm (`autotask_organization_id`) | → account |

## Joins

- `autotask_opportunity_id` is the merge/join key across the three sources.
- `account_external_ref` → the silver account.
- Downstream: the merged opportunity feeds the sale→delivery executor (ADR-0044)
  — client setup, provisioning, and ticket-fire, DocuSign-gated and idempotent.

## Notes

Opportunity titles and account references can carry client identity — keep
client-identifying values out of this doc; resolve specifics against the live
read-only DB.
