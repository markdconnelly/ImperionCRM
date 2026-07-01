---
type: Silver Table
title: tax_jurisdiction
entity: tax_jurisdiction
archetype: H
description: A taxing jurisdiction (state/county/city/district/country) plus its economic-nexus thresholds and tax-authority surface — the reference substrate of the sales-tax nexus model.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [reference, finance, tax, nexus, jurisdiction]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# tax_jurisdiction

A **taxing jurisdiction** — state, county, city, special district, or country — together
with its **economic-nexus thresholds** (sales amount, transaction count, measurement
period) and its tax-authority contact surface. Reference/config (archetype H), part of the
sales-tax nexus model ([#1620](https://github.com/markdconnelly/ImperionCRM/issues/1620),
epic [#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534), finance-at-scale
[#1626](https://github.com/markdconnelly/ImperionCRM/issues/1626) Cluster 2). The 09-20
sales-tax nexus & filings procedure evaluates taxable revenue against these thresholds.

These are **Imperion's own** tax obligations (company scope) — nothing here is per-client.

## Source of record / authority

**Curated or tax-engine-fed** (`tax_record_source` provenance on the dependent tables): a
human or the external tax engine / accountant supplies jurisdictions and threshold values;
the tax authority itself is always the ultimate authority for the rule. Agents read;
writes land via the backend (approval-gated), never a direct silver write.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | 'Pennsylvania', 'Philadelphia' |
| `level` | enum `tax_jurisdiction_level` | `country` · `state` · `county` · `city` · `district` (default `state`) |
| `country_code` | text | ISO 3166-1 alpha-2, default `US` |
| `region_code` | text | state/province code, e.g. 'PA' |
| `parent_jurisdiction_id` | uuid | FK → `tax_jurisdiction` (self; `ON DELETE SET NULL`) — city under state, etc. |
| `economic_nexus_sales_threshold` | numeric(14,2) | e.g. 100000.00 |
| `economic_nexus_transaction_threshold` | integer | e.g. 200 |
| `threshold_measurement_period` | text | `calendar_year` (default) · `rolling_12m` · `prior_or_current_year` |
| `tax_authority_name` / `tax_authority_url` | text | the authority surface |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**Constraint:** `tax_jurisdiction_uniq` — `UNIQUE (country_code, region_code, level, name)`
(the upsert key for the curated/engine feed).

## Joins

- `tax_nexus_registration.jurisdiction_id` → here (Imperion's registration state, 1:1).
- `tax_taxability_rule.jurisdiction_id` → here (taxability by product category).
- `parent_jurisdiction_id` → self (jurisdiction hierarchy).

## Notes

`data_class` is **`financial`** (always-gate) — company tax posture. Thresholds are rules,
not amounts owed; no PII. Migration 0250 (batch-assigned for the #1534 schema wave —
re-verified at merge per §10.3).
