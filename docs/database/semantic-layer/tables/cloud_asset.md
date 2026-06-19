---
type: Silver Table
title: cloud_asset
description: Provider-agnostic cloud resource — one row per cloud asset, merged from per-provider bronze and discriminated by provider.
resource: ../../../decision-records/ADR-0097-cmdb-authority-model.md
tags: [silver, service-desk, cmdb, cloud, asset, merge]
timestamp: 2026-06-18T00:00:00Z
---

# cloud_asset

The silver record for a single cloud resource in a client's managed estate (a VM, storage
account, database, network object, …). Provider-agnostic by construction: a `provider`
discriminator (`azure` · `aws` · `gcp` · `other`) lets one table and one CMDB surface span
every cloud. Backs the CMDB **cloud** Configuration Item arm
([ADR-0097](../../../decision-records/ADR-0097-cmdb-authority-model.md), epic #372, #874).

## Source of record / authority

The cloud provider is authoritative; the app never edits cloud assets (read-only CMDB).
**Azure is the first feed** — the per-managed-client Azure ARM resource bronze
`cloud_resources` (source `azure_arm`, migration 0130), collected by the on-prem
local-pipeline (LocalPipeline #201/#216). `aws_*` / `gcp_*` feeds add their own bronze +
merge arm later with no change to this table.

**Distinct from the partner-tenant posture set** `azure_resources` (0038) — that is
one-tenant, security-scoped inventory and is **not** account-relatable. Do not conflate the
two.

## Bronze match / merge

The **on-prem local-pipeline** bronze→silver merge (`Invoke-ImperionCloudAssetMerge`,
LocalPipeline #241) reads `cloud_resources` and upserts one silver row per resource. It
**co-locates with ingestion** (local-pipeline ADR-0026): the local pipeline already collects
the Azure ARM bronze, so it owns the merge too — moved off the cloud Pipeline (#126), which
cedes its copy via Pipeline #135. Both writers are idempotent on the same key, so the cede
window is gap-free. The merge:

1. **Key** — upsert on `(provider, external_id)`; `external_id` is the provider-native id
   (the ARM resource id for azure). Idempotent.
2. **Normalize** — `native_type` keeps the raw provider type
   (e.g. `Microsoft.Compute/virtualMachines`); `category` is the coarse provider-neutral
   bucket the merge derives from it (`compute`/`storage`/`network`/`database`/…).
3. **Owner** — `account_id` resolves from the bronze `tenant_id` via `account_tenant`
   (admin-managed, 0061). Unmapped tenant → `account_id` stays NULL; the row is retained and
   `tenant_id` is preserved so a later mapping re-resolves it deterministically.

Runs on 0 rows until the collector populates the bronze and the tenant map is filled.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (owning client; ON DELETE SET NULL; NULL when tenant unmapped) |
| `provider` | cloud_provider | `azure` · `aws` · `gcp` · `other` |
| `external_id` | text | provider-native id (ARM resource id for azure); unique with `provider` |
| `name` | text | resource display name |
| `native_type` | text | raw provider type, e.g. `Microsoft.Compute/virtualMachines` |
| `category` | cloud_asset_category | normalized bucket (compute/storage/network/database/identity/web/analytics/integration/security/management/other) |
| `region` | text | azure: location |
| `resource_group` / `subscription_ref` | text | azure hierarchy (parent RG name / subscriptionId) |
| `status` | text | provisioning/power state (provider-specific) |
| `sku` | text | |
| `tags` | jsonb | provider tag map |
| `tenant_id` | text | source tenant — re-resolve account via `account_tenant` |
| `source` | text | bronze feed key, e.g. `azure_arm` |
| `last_seen_at` | timestamptz | bronze `collected_at` of the latest merge |

Unique `(provider, external_id)`. Indexed on `account_id` and `(provider, category)`.

## Joins

- `account_id` → `account` (ON DELETE SET NULL) — the owning managed client.
- `tenant_id` → `account_tenant.tenant_id` — the account-resolution path the merge uses.
- Bronze origin: `cloud_resources` via `cloud_resource_bronze_all`; RG/subscription hierarchy
  in `cloud_resource_groups` / `cloud_subscriptions`.
- CMDB: projected as the `cloud` CI type (`${ci_type}:${ci_id}`), joined to the criticality
  overlay (`cmdb_ci_overlay`) and relationship graph (`ci_relationship`) like the other CIs.

## Notes

Resource names, ARM ids, and tags are client-identifying estate data — keep specific values
out of this doc; resolve against the live read-only DB. No secrets here.
