---
type: Silver Table
title: device
description: Unified asset/endpoint — one row per device, merged from three bronze sources by precedence.
resource: ../../../decision-records/ADR-0039-per-source-bronze-tables.md
tags: [silver, crm, device, merge]
timestamp: 2026-06-15T00:00:00Z
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
  `m365_devices` (Intune/Graph directory; precedence label `m365_synced`, lowest).

## Bronze match / merge

How the sources collapse to one asset (Pipeline `device-matcher`); the owning account
resolves best-effort through the same-source company bronze row (`companyExternalRef`).
Runs on 0 rows until device data lands (ADR-0039 — device pulls deferred):

1. **Serial match** (confidence `0.95`) — a source row joins an existing device when its
   `serial_number` matches exactly.
2. **Name match** (`0.6`) — else case-insensitive `name` equality **within the owning
   account** (`account_id`).
3. **Create** (`1.0`) — else a new device is inserted (name/account/serial); website rows
   are pre-linked (resurrection guard).

Once linked, each device is **recomputed** from all its linked source rows by the
precedence above; merged fields = `name`, `device_type`, `manufacturer`, `model`,
`serial_number`, `os`, `status`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (best-effort owner; ON DELETE SET NULL) |
| `name` | text | hostname / asset name |
| `device_type` | text | free-text, e.g. `workstation` · `server` · `network` · `mobile` |
| `manufacturer` / `model` / `serial_number` | text | serial is the primary match key |
| `os` | text | |
| `status` | text | free-text, e.g. `active` · `retired` |
| `last_seen_at` | timestamptz | |

## Joins

- `account_id` → `account` (ON DELETE SET NULL). Bronze origins via `device_bronze_all`.
- Security-posture context (Intune/Defender managed-device feeds) is keyed by tenant, not
  FK'd here — see `tenant_posture` / posture bronze.

## Notes

Hostnames and serials are client-identifying asset data — keep specific values out of this
doc; resolve against the live read-only DB.
