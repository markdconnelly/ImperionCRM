---
type: Silver Table
title: tax_nexus_registration
entity: tax_nexus_registration
archetype: B
description: Imperion's own sales-tax registration state per jurisdiction — the nexus determination (monitoring → threshold → registered), permit mirror, and filing cadence.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, finance, tax, nexus, registration]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# tax_nexus_registration

**Imperion's own sales-tax registration state per jurisdiction**: the nexus determination
lifecycle (`monitoring` → `approaching_threshold` → `registration_required` → `registered`,
or a resolved `not_registered`; eventually `deregistered`), the mirrored permit number, and
the jurisdiction-assigned `filing_frequency`. Single-source-of-record silver mirror
(archetype B), part of the sales-tax nexus model
([#1620](https://github.com/markdconnelly/ImperionCRM/issues/1620), epic
[#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534), Cluster 2). Exactly
**one row per jurisdiction** — Imperion is a single legal entity. Company scope, never
per-client.

## Source of record / authority

**External SoR = the tax engine / accountant** (and ultimately the tax authority);
Imperion **mirrors**. The 09-20 procedure (Audrey computes, Sterling governs cadence)
**proposes** status transitions — every nexus determination is citation-backed
(`determination_citation`: the rule + revenue source + as-of, doctrine A5) — and the
**human registers** with the authority; a backend executor writes (approval-gated, **never
a direct silver write**). `source` records provenance (`tax_engine` / `accountant` /
`curated`). Web and agents read.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `jurisdiction_id` | uuid | FK → `tax_jurisdiction` (`ON DELETE CASCADE`); `UNIQUE` — one registration per jurisdiction |
| `status` | enum `tax_registration_status` | `monitoring` · `approaching_threshold` · `registration_required` · `registered` · `not_registered` · `deregistered` (default `monitoring`) |
| `nexus_basis` | enum `tax_nexus_basis` | `economic` · `physical` · `affiliate` · `marketplace` (null while monitoring) |
| `nexus_established_on` | date | when nexus was determined |
| `registered_on` | date | when the human registered with the authority |
| `registration_number` | text | permit/license number (a mirror, not a secret) |
| `filing_frequency` | enum `tax_filing_frequency` | `monthly` · `quarterly` · `semiannual` · `annual` |
| `deregistered_on` | date | |
| `external_ref` | text | tax engine / accountant reference id |
| `source` | enum `tax_record_source` | `tax_engine` · `accountant` · `curated` |
| `determination_citation` | text | rule + revenue source + as-of behind the determination (A5) |
| `notes` | text | |
| `as_of` | timestamptz | as-of of the mirrored state |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

## Joins

- `jurisdiction_id` → `tax_jurisdiction` (thresholds + authority).
- `tax_filing.registration_id` → here (the filing calendar hangs off the registration).

## Notes

`data_class` is **`financial`** (always-gate). Registration is a **binding external act the
human performs** — the agent only proposes the determination (09-20, B4 external-attest
gate; dial-proof). No PII. Migration 0250 (batch-assigned — re-verified at merge, §10.3).
