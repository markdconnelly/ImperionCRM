---
adr: 0047
title: "Read-only device & cloud-asset inventory"
status: accepted
date: 2026-06-09
repo: frontend
summary: "A `device_inventory_all` view merges silver devices with IT Glue configurations for a read-only inventory page."
tags: [surfaces]
---
# ADR-0047: Read-only device & cloud-asset inventory

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-09 |
| **Cross-references** | — |

## Problem

Operators need one place to see every customer device/cloud asset — "merge the
major details into a single view" (Mark's UI review, 2026-06-09) — explicitly
**not editable in the app**: devices are managed in their source systems
(IT Glue, Intune, UniFi when it lands).

## Context

Silver `device` (ADR-0039) exists but is empty — the itglue/m365 device pulls
are deferred and UniFi isn't built. Meanwhile the local pipeline has already
loaded 450+ real `itglue_export_configurations` (migration 0038, account-linked
via the itglue org → `account_bronze_all` chain). The app reads local-pipeline
bronze through views owned by the migration role (the 0038/0039 citation-view
pattern), which also solves table-level grants.

## Options considered

1. A `device_inventory_all` VIEW unioning silver `device` with not-yet-merged
   IT Glue configurations; page reads only the view (this decision).
2. Wait for the device pulls to fill silver and read `device` alone (rejected —
   ships an empty page while 450+ real assets sit in bronze).
3. Query `itglue_export_configurations` directly from the app (rejected — the
   web role has no direct grant on local-pipeline bronze tables; views are the
   established access pattern).

### Tradeoffs

- (1) real data on day one; when device pulls land, merged configs drop out of
  the bronze arm automatically (anti-join on `itglue_devices.device_id`) and
  appear as silver rows — no UI change. Cost: jsonb attribute extraction.
- IT Glue attribute paths are **flagged assumptions**: read defensively from
  both envelope shapes (`raw_payload->'attributes'->>x` and `raw_payload->>x`);
  a wrong path degrades to a NULL column, never an error.

## Decision

- **Migration 0053** — `device_inventory_all` view (silver arm + IT Glue
  configurations arm with account linkage and the merged-row anti-join);
  SELECT granted to the web role only.
- **Repository** — `crm.listDeviceInventory()` reads the view; mock fallback
  returns empty so the page is safe before the migration applies.
- **Page** — `/devices` ("Devices & Assets", nav after Tickets): read-only
  table (name, type, account, make/model, serial, OS, status, source badge,
  last seen) with an explicit "not editable in the app" marker. No actions, no
  forms — there is deliberately nothing to authorize (ADR-0045).

## Consequences

### Security impact

Read-only by construction (no server actions). Access via a migration-owned
view keeps least-privilege grants (web role: SELECT on the view only).

### Cost impact

None material — one view; the union is cheap at this data size.

### Operational impact

Apply migration 0053 (after 0052). UniFi lands later as either silver rows or
a third view arm (`unifi_devices` bronze + ingestion are a separate ADR).

## Future considerations

UniFi bronze + config-compliance columns; ~~the per-device "our security
policies applied" indicator (needs the posture mapping ADR)~~ — **shipped
2026-06-12 (#162)**, see the update below; device detail
page with `device_related_bronze` citations (view already exists, 0039);
filters/saved views reuse (ADR-0046, `entity_type='device'`).

## Update 2026-06-12 — per-device policy indicator (#162, ADR-0051 §6)

The inventory now carries a read-only **Policy** column sourced ONLY from
Intune Device Compliance (`intune_managed_devices` bronze, migration 0069 —
the web role's explicit SELECT grant in that migration exists for this read;
the on-prem collector is local-pipeline PR #123).

- **Join:** `listDeviceInventory()` LEFT JOIN LATERALs the bronze by
  `serial_number` (the only join key `device_inventory_all` exposes; the
  bronze's `azure_ad_device_id` index becomes useful once the pipeline's
  silver merge stamps it), latest row by `collected_at`.
- **Classification** (`src/lib/security/device-policy.ts`, unit-tested):
  `compliant` → green; `noncompliant`/`conflict`/`error`/`inGracePeriod` →
  drift (amber); any other reported state → ungoverned (amber). No matching
  bronze row, no `lastSyncDateTime`, or a sync older than 30 days → the
  indicator is **absent** — never green. Tenant-level posture is never
  proxied down to a device ("a green dot on a non-reporting laptop is worse
  than no dot").
- **Empty state:** until the on-prem daily task first runs, the bronze is
  empty and every row simply shows no indicator — no error, no UI change
  needed when rows land.
