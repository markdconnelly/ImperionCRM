---
type: Silver Table
title: device
description: Unified asset/endpoint — one row per device, merged from three bronze sources by precedence.
resource: ../../../decision-records/ADR-0039-per-source-bronze-tables.md
tags: [silver, crm, device, merge]
timestamp: 2026-06-14T00:00:00Z
---

# device

The silver asset record for a client's endpoint/hardware. Governed by
[ADR-0039](../../../decision-records/ADR-0039-per-source-bronze-tables.md) and
[ADR-0047](../../../decision-records/ADR-0047-device-inventory.md); union view
`device_bronze_all`.

## Source of record / authority

Three bronze sources merge; **precedence `website` > `itglue` > `m365`**. Matched
primarily by serial number, then name within an account; website rows are pre-linked
(resurrection guard).

- `website_devices` (manual, highest) · `itglue_devices` (documentation) ·
  `m365_devices` (Intune/Graph directory, lowest).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (best-effort owner) |
| `name` | text | hostname / asset name |
| `device_type` | text | |
| `manufacturer` / `model` / `serial_number` | text | serial is the primary match key |
| `os` | text | |
| `status` | text | |
| `last_seen_at` | timestamptz | |

## Joins

- `account_id` → `account`. Bronze origins via `device_bronze_all`.
- Security-posture context (Intune/Defender managed-device feeds) is keyed by tenant, not
  FK'd here — see `tenant_posture` / posture bronze.

## Notes

Hostnames and serials are client-identifying asset data — keep specific values out of this
doc; resolve against the live read-only DB.
