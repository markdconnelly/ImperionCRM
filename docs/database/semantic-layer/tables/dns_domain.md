---
type: Silver Table
title: dns_domain
description: Per-domain DNS compliance rollup — drift verdict against a human-approved golden; account_domain is the domain system of record.
resource: ../../../decision-records/ADR-0063-dns-posture-tracking.md
tags: [silver, security, dns, drift]
timestamp: 2026-06-14T00:00:00Z
---

# dns_domain

The per-domain DNS drift rollup. Governed by
[ADR-0063](../../../decision-records/ADR-0063-dns-posture-tracking.md); migration `0080`
(bronze `dns_zones` / `dns_records`, two planes: Azure-zone + public-resolve).

## Source of record / authority

`account_domain` (admin-managed list, keyed `account_id + domain`) is the **system of
record for which domains are monitored**. The drift `verdict` (`compliant` / `drift` /
`ungoverned` / `missing`) is computed against the **human-approved golden** (`dns_golden`,
approved via the on-prem `Set-ImperionDnsGoldenState`). Two planes feed it: ARM/Azure DNS
zones + ground-truth public resolution.

## Schema

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | text | owning tenant |
| `domain` | text | monitored domain |
| `verdict` | text | compliant / drift / ungoverned / missing |
| `records_compliant` / `records_drift` / `records_ungoverned` / `records_missing` | integer | per-record classification |
| `score` | numeric | compliance score |
| `account_id` | uuid | FK → `account` (nullable) |
| `last_captured_at` / `refreshed_at` | timestamptz | |

## Joins

- `account_id` → `account`; `domain` ↔ `account_domain` (the SoR list). Golden state:
  `dns_golden`. Bronze: `dns_zones`, `dns_records`.

## Notes

Domains and DNS detail are client-identifying — keep specifics out of this doc; resolve
against the live read-only DB.
