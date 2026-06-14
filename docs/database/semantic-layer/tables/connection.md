---
type: Silver Table
title: connection
description: OAuth/integration connection record — per-user or company-wide; tokens custodied in Key Vault by reference; carries the poll cadence.
resource: ../../../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md
tags: [silver, identity, connection, reference, config]
timestamp: 2026-06-14T00:00:00Z
---

# connection

A connection to an external provider — the token-custody and sync-config record. Governed
by
[ADR-0024](../../../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md)
and [ADR-0038](../../../decision-records/ADR-0038-per-connection-poll-cadence.md) (cadence).

## Source of record / authority

**System of record for sync config; secrets are NOT here.** `keyvault_secret_ref` is a
**reference** to the Key Vault secret — the token itself is **never** stored in the
database or this doc. `scope` is `user` (per-user personal connection, `owner_user_id`) or
`company`. `poll_interval_minutes` is the cadence gate (`0` = manual/paused; the pipeline's
`pollDue()` honors it); `sync_cursor` tracks incremental progress.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `scope` | enum | user / company |
| `owner_user_id` | uuid | FK → `app_user` (user scope) |
| `provider` | enum | m365, google, autotask, itglue, apollo, facebook, … |
| `status` | enum | connected / error / disconnected |
| `scopes` | text[] | granted OAuth scopes |
| `keyvault_secret_ref` | text | **reference only — never the secret value** |
| `external_account_id` | text | provider account id |
| `poll_interval_minutes` | integer | cadence gate (0 = paused) |
| `sync_cursor` | jsonb | incremental cursor |
| `last_sync_at` / `connected_at` | timestamptz | |

## Joins

- `owner_user_id` → `app_user`. Referenced by `interaction.source_connection_id` and
  enrichment provenance.

## Notes

**Never store, print, or commit a token value** — only the Key Vault reference. Provider
account ids can be sensitive; resolve specifics against the live read-only DB.
