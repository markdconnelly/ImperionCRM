---
type: Silver Table
title: device
entity: device
archetype: A
description: Unified asset/endpoint — one row per device, merged from per-source bronze by precedence (incl. Datto RMM) + BCDR backup-posture field merge.
resource: ../../../decision-records/ADR-0039-per-source-bronze-tables.md
tags: [silver, crm, device, merge]
timestamp: 2026-06-17T00:00:00Z
---

# device

The silver asset record for a client's endpoint/hardware. Governed by
[ADR-0039](../../../decision-records/ADR-0039-per-source-bronze-tables.md) and
[ADR-0047](../../../decision-records/ADR-0047-device-inventory.md); union view
`device_bronze_all`.

## Source of record / authority

Per-source device bronze merges by **precedence
`website` > `datto_rmm` > `m365` > `itglue`** (#683, proposed from LocalPipeline #195 /
LP ADR-0018). Matched primarily by serial number, then name within an account; website
rows are pre-linked (resurrection guard — `website` stays highest, untouched).

- `website_devices` (manual, highest) · `datto_rmm_devices` (RMM managed-estate:
  device-existence + live-state — online, OS, patch/AV; bronze `0119`) · `m365_devices`
  (Intune/Graph directory, enrolled-only; precedence label `m365_synced`) ·
  `itglue_devices` (documentation, lowest).

**Authority note (#683):** Datto RMM is a strong machine authority (it actually sees the
endpoint live), so it sits above `m365` (enrolled-only) and `itglue` (documentation).
This also drops `itglue` **below** `m365` — a reorder of the two pre-existing sources
(was `itglue` > `m365`): live Intune enrolment now outranks IT Glue documentation.

**Backup posture (BCDR) is a field-scoped merge, not identity precedence.**
`datto_bcdr_backups` (bronze `0119`) contributes backup-posture fields
(`backup_protected`, `last_backup_at`, `last_good_backup_at`) onto the unified device,
joined on Datto `device_uid` (carried as `datto_device_uid`); it does **not** compete to
own device identity. `myitprocess_recommendations` (bronze `0119`) is account-advisory,
not device data — it does not feed `device` (candidate for its own account-scoped concept,
expansion #536).

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
precedence above; merged identity fields = `name`, `device_type`, `manufacturer`,
`model`, `serial_number`, `os`, `status`.

Separately, the matcher resolves the device's Datto `device_uid` (from
`datto_rmm_devices` / a serial cross-walk) and copies BCDR backup posture from
`datto_bcdr_backups` onto the same row (`backup_protected`, `last_backup_at`,
`last_good_backup_at`) — a field merge keyed by `datto_device_uid`, independent of
identity precedence. The cloud-Pipeline `device-matcher` wiring for both the new
precedence and the BCDR merge is a separate `ImperionCRM_Pipeline` PR; these columns
run null until it lands.

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
| `datto_device_uid` | text | Datto RMM/BCDR join key (`0140`); set by the matcher |
| `backup_protected` | boolean | BCDR posture: protected / unprotected / unknown (null) |
| `last_backup_at` | timestamptz | BCDR last backup (`0140`) |
| `last_good_backup_at` | timestamptz | BCDR last verified-good backup (`0140`) |

## Joins

- `account_id` → `account` (ON DELETE SET NULL). Bronze origins via `device_bronze_all`.
- `datto_device_uid` → `datto_rmm_devices.device_uid` / `datto_bcdr_backups.device_uid`
  (bronze `0119`) — the join carrying RMM live-state refresh and BCDR backup posture.
- Security-posture context (Intune/Defender managed-device feeds) is keyed by tenant, not
  FK'd here — see `tenant_posture` / posture bronze.

## Notes

Hostnames and serials are client-identifying asset data — keep specific values out of this
doc; resolve against the live read-only DB.
