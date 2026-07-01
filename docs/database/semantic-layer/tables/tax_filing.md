---
type: Silver Table
title: tax_filing
entity: tax_filing
archetype: B
description: The sales-tax filing calendar + status per registration × period — due_date is the B9 deadline-sentinel's clock; the filing itself is the human's external attestation.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, finance, tax, filing, deadline-sentinel]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# tax_filing

The **sales-tax filing calendar + status**: one row per `tax_nexus_registration` ×
filing period, carrying the `due_date`, the quantified tie-out (gross/taxable sales,
tax collected/due/paid), and the lifecycle (`upcoming` → `in_preparation` → `filed` →
`paid`; `late` / `amended` / `waived`). Single-source-of-record silver mirror
(archetype B), part of the sales-tax nexus model
([#1620](https://github.com/markdconnelly/ImperionCRM/issues/1620), epic
[#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534), Cluster 2).

`due_date` is the clock the **B9 deadline-sentinel** (09-20) watches — T-30/T-7/T-1
lead-time escalation with rising urgency up `reports_to`; a passed deadline is a **logged
escalation failure** surfaced in Sterling's brief. The sentinel **never auto-files** even
under deadline pressure.

## Source of record / authority

**External SoR = the tax authority** (via the tax engine / accountant); Imperion
**mirrors** filing state and pre-stages the package. Audrey **quantifies** the liability
(taxable base, rate, liability, as-of — parked, never fabricated on empty data, A5b) and
routes the evidence-backed package; the **human files** — an external attestation
(B4, `always_gate`, doctrine A2 class-6 binding/legal). A backend executor writes the
mirror rows (approval-gated, never a direct silver write). `source` records provenance.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `registration_id` | uuid | FK → `tax_nexus_registration` (`ON DELETE CASCADE`) |
| `period_start` / `period_end` | date | the filing period (`period_end >= period_start` CHECK) |
| `due_date` | date | THE sentinel clock (T-30/T-7/T-1) |
| `status` | enum `tax_filing_status` | `upcoming` · `in_preparation` · `filed` · `paid` · `late` · `amended` · `waived` (default `upcoming`) |
| `gross_sales` / `taxable_sales` | numeric(14,2) | the tie-out base |
| `tax_collected` / `tax_due` / `tax_paid` | numeric(14,2) | the quantified liability + settlement |
| `filed_on` / `paid_on` | date | the human's external attestation dates |
| `confirmation_number` | text | authority confirmation (mirror) |
| `external_ref` | text | tax engine / accountant reference id |
| `source` | enum `tax_record_source` | `tax_engine` · `accountant` · `curated` |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**Constraint:** `tax_filing_period_uniq` — `UNIQUE (registration_id, period_start,
period_end)` (the upsert key for calendar generation from `filing_frequency`).

## Joins

- `registration_id` → `tax_nexus_registration` → `tax_jurisdiction` (cadence, thresholds,
  authority).
- Taxable-base inputs come from revenue sources (QBO invoice mirror) at compute time —
  referenced by the 09-20 tie-out, not FK-linked.

## Notes

`data_class` is **`financial`** (always-gate). Filing amounts are Imperion's own
liabilities — no client PII. The filing act is permanently human (`always_gate`,
dial-proof floor). Migration 0250 (batch-assigned — re-verified at merge, §10.3).
