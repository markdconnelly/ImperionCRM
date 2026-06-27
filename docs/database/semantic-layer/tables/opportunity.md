---
type: Silver Table
title: opportunity
entity: opportunity
archetype: A
description: Merged silver opportunity from three bronze sources (KQM quote header, Autotask, website manual); the object the app uses.
resource: ../../../decision-records/ADR-0080-sale-to-delivery-orchestration.md
tags: [silver, sales, opportunity, kqm, autotask, forecast]
data_class: financial
timestamp: 2026-06-27T00:00:00Z
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

The merge is **dual-run** (corrected ADR-0026 pipeline-parity framing): the **local
pipeline runs it on a timed cycle**, the **cloud Pipeline runs the SAME merge
event-driven** on website manual edits — **neither plane owns it**. It is **deterministic
+ rank-guarded** on the precedence above, so a lower-precedence source never clobbers a
higher one and concurrent dual-run converges to the same result. The merge DML is granted
to both pipeline DB roles.

**Single-opportunity guarantee (Autotask↔KQM).** A KQM quote **attaches to a pre-existing
Autotask opportunity** (never "create new"), and won updates that **same** opportunity, so
the `autotask_opportunity_id` join key keeps it **ONE silver row** — no duplicate. The
operator SOP that enforces this is
[sales-kqm-autotask-opportunity-sop](../../../runbooks/sales-kqm-autotask-opportunity-sop.md);
an Autotask opportunity set closed/lost while a quote is still linked is surfaced by the
#1403 integrity guard.

- **KQM** (`kqm_opportunities`) — quote header; KQM is the quote system of record
  (read-only, native CPQ gutted per the sale→delivery pivot).
- **Autotask** (`autotask_opportunities`) — the Autotask Opportunity entity; read shape
  (columns, `entityInformation` probe, join keys) in
  [Autotask Opportunities API](../../../integrations/autotask-opportunities-api.md) (#430).
- **Website** (`website_opportunities`) — manual sales-team entry, highest
  precedence (a human override wins). The sales team captures the context a machine
  feed can't: running **`notes`** and uploaded **`knowledge_blob_refs`** (documents
  about the customer/deal, stored in Azure Blob per ADR-0064; #429). The web app
  writes this bronze (source='website') keyed by the silver opportunity id as
  `external_id`; the uploaded knowledge feeds the gold layer for the orchestrator.

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
| `account_external_ref` | kqm (`autotask_organization_id`) / website (`account_ref`) | → account |

The website source additionally carries manual-only fields **not** projected by the
union view but read directly off `website_opportunities` for the Deal 360 (#429):
`notes` (free text) and `knowledge_blob_refs` (jsonb array of Azure Blob pointers —
`{blobPath, filename, contentType, byteSize, contentHash, uploadedAt, uploadedByUserId}`).

## Forecasting fields (ADR-0072, migration 0114)

The deal is the unit forecasting reasons over. Three website-owned forecast fields
sit on `opportunity` alongside the merged source fields:

| Column | Notes |
|---|---|
| `expected_close_date` | the **forecasted** close — what period a deal forecasts into. Distinct from `closed_at`, the **actual** close set on won/lost. |
| `win_probability` | 0..1. Defaulted **per `sales_stage`** in the app read model (`lib/forecast.ts`; NULL = use the stage default), owner-overridable. Weighted forecast = Σ(`deal_value` × `win_probability`). |
| `forecast_category` | the owner's explicit `commit` \| `best_case` \| `pipeline` \| `omitted` call — **independent of `sales_stage`** (a late-stage deal can be best-case, an early deal omitted). NULL = not yet categorised; `omitted` = excluded from the forecast. |

`deal_value` is `amount_mrr` in v1 and becomes quote-derived post-CPQ (ADR-0067).
The per-owner/period roll-up (weighted + categorised bands + closed-won + quota
attainment) is the **runtime computation** in `lib/forecast.ts`, not stored on the
row; point-in-time history lives in [`forecast_snapshot`](forecast_snapshot.md), and
targets in [`quota`](quota.md). Revenue + quota are RBAC-gated (ADR-0030 —
`canSeeRevenue`).

## Kind discriminator

`opportunity.kind` (`new` | `renewal` | `upsell` | …) types the opportunity. A **renewal**
is an opportunity *kind*, spawned by a contract's expiration (a sales event): the
opportunity documents the pursuit while the app-native
[`contract_renewal`](../../../decision-records/ADR-NNNN-renewals-and-opportunity-consistency.md)
satellite holds the renewal-specific lifecycle and pricing (the opportunity merge never
writes that satellite). A `kind=renewal` opportunity is minted at *pursuit*, not when the
renewal is first identified.

## Joins

- `autotask_opportunity_id` is the merge/join key across the three sources.
- `account_external_ref` → the silver account.
- `owner_user_id` → `app_user`: the deal owner — the axis quota and forecast
  roll-ups group by (ADR-0072).
- Downstream: the merged opportunity feeds the sale→delivery executor (ADR-0044)
  — client setup, provisioning, and ticket-fire, DocuSign-gated and idempotent.

## Notes

Opportunity titles and account references can carry client identity — keep
client-identifying values out of this doc; resolve specifics against the live
read-only DB.
