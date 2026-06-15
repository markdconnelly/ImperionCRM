---
type: Silver Table
title: dns_domain
description: Per-domain DNS silver rollup — a governance verdict (manageability ladder) plus per-record drift counts against a human-approved golden; account_domain is the domain system of record.
resource: ../../../decision-records/ADR-0063-dns-posture-tracking.md
tags: [silver, security, dns, drift, golden]
timestamp: 2026-06-15T00:00:00Z
---

# dns_domain

The per-domain DNS rollup — one row per monitored domain. Governed by
[ADR-0063](../../../decision-records/ADR-0063-dns-posture-tracking.md); migration `0080`
(bronze `dns_zones` / `dns_records`, two capture planes: ARM/Azure-zone + public-resolve)
and `0081` (`account_domain`, the operator-curated domain registry). Produced by the
on-prem golden/drift merge (`Invoke-ImperionDnsMerge`, LocalPipeline #157) and the cloud
on-demand single-domain refresh, which share one classification SQL expression (parity
contract, ADR-0063 §2).

## Source of record / authority

`account_domain` (operator-curated per-account list, keyed `account_id + domain`,
migration `0081`) is the **system of record for which domains are monitored** (ADR-0063
amendment 2026-06-12: account-scoped, not tenant-derived). The drift counts are computed
against the **human-approved golden** (`dns_golden`, approved via the on-prem
`Set-ImperionDnsGoldenState`); two planes feed the comparison — ARM/Azure DNS zones (the
manage plane, also proves write) and ground-truth public resolution.

`verdict` and the drift counts answer **two different questions** and must not be
conflated:

- **`verdict`** is the three-state **governance / manageability ladder** (the migration
  `0080` CHECK): `not-in-azure` → `in-azure-readonly` → `managed` (only `managed` means
  hosted in Azure DNS *and* write-proven *and* live NS authoritatively resolve to that
  zone). It answers "is this customer's DNS under our control yet?".
- **`records_compliant` / `records_drift` / `records_ungoverned` / `records_missing`** are
  the **four-state per-record drift classification** (the ADR-0051 golden/drift ladder —
  full-outer-join of observed records vs golden), rolled up as counts. They answer "how
  far has this domain drifted from its approved baseline?".

## Schema

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | text | Azure-plane context (zone lives in a subscription/tenant); part of PK |
| `domain` | text | monitored domain; part of PK |
| `verdict` | text | governance ladder — not-in-azure / in-azure-readonly / managed |
| `records_compliant` / `records_drift` / `records_ungoverned` / `records_missing` | integer | per-record drift classification counts (vs golden) |
| `score` | numeric | 0–100 DNS posture score (drift + verdict weighted) |
| `account_id` | uuid | FK → `account` (additive, nullable); the per-account join key |
| `last_captured_at` / `refreshed_at` | timestamptz | |

## Joins

- `account_id` → `account` (the per-account read key); `domain` ↔ `account_domain` (the SoR
  list). Golden baseline: `dns_golden` (keyed `tenant_id + domain`). Bronze detail:
  `dns_zones`, `dns_records` (per-recordset, both planes).

## Notes

Domains and DNS detail are client-identifying — keep specifics out of this doc; resolve
against the live read-only DB. The classification SQL is owned by `Get-ImperionDnsDrift`
and reused verbatim by the cloud on-demand refresh (parity contract) — code knowledge
stays in the cmdlets / ADR-0063, not here.
