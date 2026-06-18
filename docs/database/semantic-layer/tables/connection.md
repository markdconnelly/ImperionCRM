---
type: Silver Table
title: connection
description: OAuth/integration connection record + Key Vault credential registry — personal/company/client scope; tokens custodied in Key Vault by reference (name only); client connections link to an account; carries auth method + poll cadence.
resource: ../../../decision-records/ADR-0103-connection-credential-registry.md
tags: [silver, identity, connection, reference, config]
timestamp: 2026-06-18T00:00:00Z
---

# connection

A connection to an external provider — the token-custody and sync-config record. Governed
by
[ADR-0024](../../../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md)
and [ADR-0038](../../../decision-records/ADR-0038-per-connection-poll-cadence.md) (cadence).

## Source of record / authority

**System of record for sync config + the Key Vault credential registry; secrets are NOT
here.** `keyvault_secret_ref` is the Key Vault secret **name** (human-readable standard
`conn-<scope>-<provider>[-<tenantId|userId>]`, ADR-0103) — the token/secret itself is
**never** stored in the database, this doc, or any GUI. `scope` is `user` (personal,
`owner_user_id`), `company` (Imperion as its own first client), or `client` (a managed
customer — `account_id` set; ADR-0103). `auth_method` records how the M365 enterprise app
authenticates (`certificate` | `secret`; NULL for OAuth/token providers).
`poll_interval_minutes` is the cadence gate (`0` = manual/paused; the pipeline's `pollDue()`
honors it); `sync_cursor` tracks incremental progress.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `scope` | enum | `user` (personal) · `company` · `client` (managed customer; ADR-0103) |
| `owner_user_id` | uuid | FK → `app_user` (set for user scope; NULL for company/client; ON DELETE CASCADE) |
| `account_id` | uuid | FK → `account` (set for client scope; many connections → one account; ON DELETE SET NULL; ADR-0103) |
| `auth_method` | text | `certificate` · `secret` (M365 enterprise app); NULL for OAuth/token providers (ADR-0103) |
| `cert_thumbprint` | text | certificate when `auth_method=certificate` (ADR-0103) |
| `provider` | enum | append-extended per integration: `m365` · `google` · `youtube` · `linkedin` · `facebook` · `plaud` · `autotask` · `itglue` (0020) · `apollo` (0031) · `myitprocess` · `televy` · `quotemanager` · `gdap` (0033) · `darkwebid` (0042) · `acs` (0071) · `qbo` (0093) · `meta` (0127 — company FB/IG send credential, distinct from per-user `facebook` ingest) |
| `display_name` | text | human label for the connection |
| `status` | enum | `active` (default) · `pending` (0033) · `expired` · `revoked` · `error` |
| `scopes` | text[] | granted OAuth scopes |
| `keyvault_secret_ref` | text | **reference only — never the secret value** |
| `external_account_id` | text | provider account id |
| `poll_interval_minutes` | integer | cadence gate (default `60`; `0` = manual/paused; CHECK ≥ 0; ADR-0038, migration 0035) |
| `sync_cursor` | jsonb | incremental cursor |
| `last_sync_at` / `connected_at` | timestamptz | |

## Joins

- `owner_user_id` → `app_user`. Referenced by `interaction.source_connection_id` and
  enrichment provenance.
- `account_id` → `account` (client-scope connections; ADR-0103). Complements
  `account_tenant` (tenant→account) for resolving a client's M365 estate.

## Notes

**Never store, print, or commit a token value** — only the Key Vault reference. Provider
account ids can be sensitive; resolve specifics against the live read-only DB.
