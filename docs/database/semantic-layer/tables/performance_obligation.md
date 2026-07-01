---
type: Silver Table
title: performance_obligation
entity: performance_obligation
archetype: B
description: ASC 606 steps 2+4 — one row per distinct performance obligation under a contract, with the allocated transaction price, recognition method, and satisfaction window; Imperion-computed working papers (OWN, not mirror — QBO holds no ASC 606 sub-ledger).
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, finance, revenue-recognition, asc-606, rev-rec]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# performance_obligation

The **distinct promise** inside a contract, per ASC 606: one row per performance obligation
carrying the allocated transaction price (step 4, relative standalone-selling-price), the
recognition **method** (`ratable` · `point_in_time` · `usage` · `milestone` ·
`percent_complete`) and the satisfaction window. Parent of
[revenue_schedule](revenue_schedule.md) (the per-period recognition rows). Built for
procedure **09-18 "Run revenue recognition (ASC 606)"** (#1619, epic #1534 — $100M gap-fill
Cluster 2). App-native silver (archetype B), Imperion-computed, `financial` data class.

## Source of record / authority

**OWN, not mirror** — the resolved own-vs-mirror decision for rev-rec (the opposite pole of
ADR-0140's AR/invoice mirror): QuickBooks Online holds **no ASC 606 sub-ledger object**, so
there is nothing external to mirror. These are Imperion-computed **working papers**: Audrey
computes obligations from the contract + delivery/milestone signals (09-18, L2 propose-only,
B4 audit-attest, evidence cited in `source_ref` — parked, never fabricated, when evidence is
empty). **QBO remains the system of record for the posted books** (ADR-0123); the app never
posts to QBO. Contract **modifications** are new obligation rows superseding the old
(`superseded_by_id` lineage + `superseded` status) — never destructive edits, so the
allocation is auditable as of any moment.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `contract_id` | uuid | FK → `contract` (ON DELETE RESTRICT — audit trail) |
| `name` / `description` | text | the distinct promise |
| `method` | enum `rev_rec_method` | `ratable` · `point_in_time` · `usage` · `milestone` · `percent_complete` |
| `allocated_amount` | numeric(14,2) | step 4: transaction price allocated to this obligation (≥ 0) |
| `standalone_selling_price` | numeric(14,2) | SSP used for the relative allocation (audit input) |
| `currency` | text | default `USD` |
| `start_date` / `end_date` | date | satisfaction window (ratable / percent-complete term) |
| `status` | enum `performance_obligation_status` | `open` · `satisfied` · `superseded` · `cancelled` |
| `satisfied_at` | date | point-in-time: the delivery date |
| `superseded_by_id` | uuid | self-FK — contract-modification successor (with `status='superseded'`) |
| `modification_note` | text | why (cite the amendment) |
| `source_ref` | text | evidence citation (contract clause / source row / as-of) — A5 discipline |
| `version` | int | default 1 |
| `created_at` / `updated_at` | timestamptz | `updated_at` by trigger |

## Joins

- `contract_id` → [contract](contract.md) (ASC 606 steps 1+3 — the identified contract and
  its transaction price — live upstream in the contract mirror).
- `revenue_schedule.performance_obligation_id` → this row (the step-5 period rows).
- `superseded_by_id` → `performance_obligation` (modification lineage chain).
- **Deferred revenue is DERIVED, never persisted** (the ADR-0140 AR-aging precedent):
  deferred = `allocated_amount` − recognized-to-date over the child schedule rows; the
  deferred-revenue rollforward is a read-model.
- Distinct from billing: invoiced AR is [invoice](invoice.md) (ADR-0140 mirror) +
  [generated_invoice](generated_invoice.md); recognition ≠ billing.

## Notes

No PII — contract-level commercial amounts only (no personal data, no pay/comp data). No
secrets. Grants (ADR-0127 least-priv): web `SELECT` only; backend/agent runtime
`SELECT/INSERT/UPDATE` (Audrey computes; recognition acts flow through the backend's human
gate); **no DELETE for any role** — corrections are supersessions. Migration 0249
(placeholder; claimed at merge).
