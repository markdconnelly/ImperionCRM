---
type: Silver Table
title: license_assignment
entity: license_assignment
archetype: A
description: Account-resolved distributor license fact — one row per assigned license, carrying the actual licensed quantity plus optional device and agreement links.
resource: ../../../integrations/pax8-integration.md
tags: [silver, finance, procurement, license, pax8, true-up, merge]
timestamp: 2026-06-23T00:00:00Z
---

# license_assignment

The silver record for a single **assigned distributor license** in a client's estate, tied
to the owning `account`. It is the home for two things the license procure→provision→bill
loop ([epic #1042](https://github.com/markdconnelly/ImperionCRM/issues/1042)) and the
agreement true-up ([#1041](https://github.com/markdconnelly/ImperionCRM/issues/1041)) need
but the existing schema could not carry: the **actual licensed quantity** (the actual side
of the contracted-vs-actual seat reconciliation) and the **license → device / license →
agreement** links.

Distributor-agnostic by construction — a `source` discriminator (`pax8` first) lets one
table and one surface span every distributor, the `cloud_asset` provider precedent. A new
distributor adds rows, not a table.

## Source of record / authority

The **distributor is authoritative**; the app never edits a license assignment (read-only
projection). **Pax8 is the first feed** — the per-license bronze `pax8_licenses` (source
`pax8`, migration 0161), collected by the on-prem local-pipeline
([LocalPipeline #279](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/issues/279)).
This entity is **not** a system of record and is never written by the web app.

Distinct from `contract` (the client agreement header, the *contracted* side) and from
`pax8_subscriptions` bronze (the recurring commitment) — `license_assignment` is the
*assigned, account-resolved* fact the two reconcile against.

## Bronze match / merge

The **on-prem local-pipeline** bronze→silver merge populates it (merge-co-locates-with-
ingestion, [LP ADR-0026](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment)):
the local pipeline already ingests the Pax8 bronze, so it owns the merge too. An extension
of `Invoke-ImperionPax8Merge` ([LP #280](https://github.com/markdconnelly/ImperionCRM_LocalPipelineEnrichment/issues/280),
populate twin filed) reads `pax8_licenses` and upserts one silver row per license. The merge:

1. **Key** — upsert on `(source, external_ref)`; `external_ref` is the distributor-native
   license id (Pax8 license id for `pax8`). Idempotent.
2. **Owner** — `account_id` resolves from the Pax8 `company_id` through `entity_xref`
   (`entity_type='account'`, `source_system='pax8'`) — the same registry the #280 company
   merge writes. A license whose company has no resolved account is **not** projected (the
   loop never acts on the wrong client).
3. **Quantity** — `quantity` is the actual assigned seat/unit count (the true-up's actual
   side). `status`, `product_id`, `product_name`, `subscription_ref` carry from bronze.
4. **Links (filled by the loop, NULL at first)** — `device_id` is set when the Pax8
   assignee resolves to a silver `device` (the CMDB "what is licensed" link); `contract_id`
   is set by the agreement-attach step (#1085).

Runs on 0 rows until the Pax8 credential lands + migration 0161 is applied (both Mark-gated,
#1042) and the merge twin runs.

## Schema

| Column | Type | Note |
|---|---|---|
| `id` | uuid PK | surrogate |
| `account_id` | uuid → `account.id` | owning client (resolved via `entity_xref`) |
| `source` | text | distributor discriminator (`pax8` first) |
| `external_ref` | text | distributor-native license id; `(source, external_ref)` unique |
| `subscription_ref` | text | owning subscription's source id (billing-spine back-ref) |
| `product_id`, `product_name` | text | product identity (denormalised) |
| `quantity` | integer | **actual** assigned seats — the #1041 actual side |
| `status` | text | license status as the distributor reports it |
| `device_id` | uuid → `device.id` | license → device link (CMDB); NULL until resolved |
| `contract_id` | uuid → `contract.id` | license → agreement link (#1085); NULL until attached |
| `collected_at` | timestamptz | bronze freshness |

## Joins

- `account_id` → `account.id` — the client roll-up ("every license for this client").
- `device_id` → `device.id` — the CMDB device panel ("what is licensed on this device").
- `contract_id` → `contract.id` — the agreement panel ("licenses attached to this agreement").
- `entity_xref` (`source_system='pax8'`, `entity_type='account'`) — how `account_id` is
  resolved during the merge (it is **not** a join at read time).
- **Consumed by** the agreement-reconciliation actual-count read-model (`listActualCounts`,
  #1079 / epic #1041): per-account `seats = SUM(quantity)` is the *actual* side of the
  contracted-vs-actual true-up. Read-only projection — no shape/authority change
  (deploy-dormant until Pax8 hydrates this table, #1042).

## PII

Account-linked usage facts → **PII-adjacent**, access-controlled (ADR-0039). No PII
attribute lives on the row itself (the assignee is resolved to a `device_id`, never stored
as an email/name here); no secrets. Specific license counts resolve against the live
read-only DB, never docs.
