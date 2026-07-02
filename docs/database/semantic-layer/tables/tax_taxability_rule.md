---
type: Silver Table
title: tax_taxability_rule
entity: tax_taxability_rule
archetype: H
description: Taxability of a product/SKU category in a jurisdiction — treatment (taxable/exempt/reduced) + advisory rate hint + statute citation, effective-dated.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [reference, finance, tax, taxability, sku]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# tax_taxability_rule

**Taxability by product category × jurisdiction**: whether a SKU class
(`managed_services`, `saas`, `hardware`, `professional_services`, `shipping`, …) is
`taxable` / `exempt` / `reduced` / `unknown` in a jurisdiction, with an advisory
`rate_hint` and the statute/ruling `basis_citation` behind the treatment (doctrine A5),
effective-dated. Reference/config (archetype H), part of the sales-tax nexus model
([#1620](https://github.com/markdconnelly/ImperionCRM/issues/1620), epic
[#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534), Cluster 2). Feeds the
09-20 **quantify** step: the taxable base per jurisdiction is computed by classing revenue
through these rules.

## Source of record / authority

**Curated or tax-engine-fed** (`source` provenance); the tax engine / authority stays
**authoritative for rates** — `rate_hint` is advisory, never the billing rate of record.
Writes land via the backend (approval-gated); web and agents read.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `jurisdiction_id` | uuid | FK → `tax_jurisdiction` (`ON DELETE CASCADE`) |
| `product_category` | text | SKU class: 'managed_services', 'saas', 'hardware', 'professional_services', 'shipping' |
| `treatment` | enum `tax_taxability_treatment` | `taxable` · `exempt` · `reduced` · `unknown` (default `unknown`) |
| `rate_hint` | numeric(6,4) | advisory, e.g. 0.0600 |
| `effective_from` | date | default `2000-01-01` |
| `effective_to` | date | null = current (supersede by closing the window) |
| `basis_citation` | text | statute / ruling / engine rule (A5) |
| `source` | enum `tax_record_source` | `tax_engine` · `accountant` · `curated` |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**Constraint:** `tax_taxability_rule_uniq` — `UNIQUE (jurisdiction_id, product_category,
effective_from)` (the upsert key; supersede via `effective_to`).

## Joins

- `jurisdiction_id` → `tax_jurisdiction` (thresholds + authority; sibling of
  `tax_nexus_registration`).
- `product_category` is a soft key onto revenue classification (invoice lines / contract
  categories) at compute time — no FK.

## Notes

`data_class` is **`financial`** (always-gate) — rules about Imperion's own tax treatment.
An `unknown` treatment must **park, never fabricate** a liability (A5b). No PII.
Migration 0250 (batch-assigned — re-verified at merge, §10.3).
