---
type: Silver Table
title: software_ci
entity: software_ci
archetype: A
description: A software install on a managed device — one row per app on a device, projected from the Intune managed-apps bronze and backing the CMDB software Configuration Item.
resource: ../../../decision-records/ADR-0097-cmdb-authority-model.md
tags: [silver, service-desk, cmdb, software, asset, merge]
data_class: operational
timestamp: 2026-06-25T00:00:00Z
---

# software_ci

The silver record for a single piece of software installed on a device in a client's managed
estate. The grain is the **install** — one row per app on one device — which is the natural grain
of the Intune managed/detected-app feed. Backs the CMDB **software** Configuration Item arm and the
`device runs software` relationship ([ADR-0097](../../../decision-records/ADR-0097-cmdb-authority-model.md),
epic #372, #652).

## Source of record / authority

The source system is authoritative; the app never edits software (read-only CMDB, ADR-0047).
**Intune is the first feed** — the per-device managed/detected-app inventory bronze
`intune_managed_apps` (source `intune`, migration 0148), collected by the on-prem local-pipeline
(Graph `DeviceManagementApps.Read.All`, the Mark-gated grant). A future software-inventory feed
(e.g. Datto RMM) adds rows under a new `source` discriminator with no change to this table — the
`cloud_asset`/provider precedent.

## Bronze match / merge

The **on-prem local-pipeline** bronze→silver merge (`Invoke-ImperionSoftwareCiMerge`) reads
`intune_managed_apps` and upserts one silver row per install. It **co-locates with ingestion**
(local-pipeline ADR-0026): the local pipeline already collects the Intune managed-apps bronze, so
it owns the merge. The merge:

1. **Resolve the device** — match the bronze app row to a silver `device` via `managed_device_id`
   (= `intune_managed_devices.external_id`, the primary key) with `serial_number` as the fallback —
   the SAME keys the device CI already laterals `intune_managed_devices` on (0069). An app whose
   device cannot be resolved is dropped (it has no owning account → it cannot be a CI).
2. **Resolve the owner** — `account_id` is taken from the resolved `device.account_id`, so the
   software install inherits the device's owning client and the same staff/internal exclusion.
3. **Key** — upsert on `(source, device_id, external_ref)`; `external_ref` is the bronze app-row id
   (`intune_managed_apps.external_id`). Idempotent.

Runs on 0 rows until the Intune managed-apps bronze fills (the Mark-gated Graph grant + 0148 apply).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (owning client, resolved through the device; ON DELETE CASCADE) |
| `device_id` | uuid | FK → `device` (the install host; the FK that derives the `device runs software` edge; ON DELETE CASCADE) |
| `name` | text | app display name |
| `publisher` | text | app publisher / vendor |
| `version` | text | detected installed version |
| `platform` | text | windows · iOS · android · macOS · … |
| `install_state` | text | installed · failed · pendingInstall · … |
| `source` | text | feed discriminator (`intune` first) |
| `external_ref` | text | bronze app-row id (`intune_managed_apps.external_id`); unique with `source`+`device_id` |
| `last_seen_at` | timestamptz | bronze `collected_at` of the latest merge |

Unique `(source, device_id, external_ref)`. Indexed on `account_id` and `device_id`.

## Joins

- `account_id` → `account` (ON DELETE CASCADE) — the owning managed client.
- `device_id` → `device` (ON DELETE CASCADE) — the host device; the link the `device runs software`
  CMDB edge is derived from.
- Bronze origin: `intune_managed_apps` (0148), matched on `managed_device_id` / `serial_number`.
- CMDB: projected as the `software` CI type (`${ci_type}:${ci_id}`), joined to the criticality
  overlay (`cmdb_ci_overlay` — software derives a flat `low`) and the relationship graph
  (`ci_relationship` — `software -[runs-on]-> device` and `software -[belongs-to]-> account`,
  both derived), like the other CIs.

## Notes

App names, publishers, and versions are client-identifying estate data — keep specific values out
of this doc; resolve against the live read-only DB. No secrets here.
