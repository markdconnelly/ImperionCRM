---
type: Silver Table
title: circuit
entity: circuit
archetype: B
description: The circuit / carrier-service inventory — carrier circuit id, site, bandwidth, lifecycle status — the technical half of the telco lifecycle (OP-04-14); Ozzie's turn-up/cutover substrate.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, service-desk, noc, telco, circuit, inventory]
data_class: operational
timestamp: 2026-07-01T00:00:00Z
---

# circuit

The **technical half of the carrier / circuit / telco lifecycle** (OP-04-14, Stream
04↔05↔07 seam): one row per carrier circuit/service — the carrier's circuit id (ckt id),
the served site, bandwidth, and lifecycle status/dates. App-native silver (archetype B),
born in [#1651](https://github.com/markdconnelly/ImperionCRM/issues/1651) (epic
[#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534)). **Ozzie (NOC, Stream
05) owns the act** — circuit turn-up / cutover / port executes through the NOC gauntlet,
idempotency-keyed; a **service-affecting cutover is `always_gate`, halt-on-fail, no
auto-rollback** (ADR-0136 A10). The commercial clock lives on
[`carrier_contract`](carrier_contract.md) (Vance, Stream 07) — the two halves meet at an
explicit seam (A11), never co-own.

`account_id` is nullable: **NULL = Imperion's own circuit** (dogfood). There is no silver
site entity yet, so `site_name` / `service_address` are free-text labels (a business
service address, not personal data); a live circuit links into the CMDB via the OP-04-13
path (`cmdb_ci`), it is not itself a CI row.

## Source of record / authority

**Imperion app-native** (curated) today — no carrier feed exists. A backend **telco
executor** writes rows (approval-gated, server-side, **never a direct silver write**).
`source` + `external_ref` carry ADR-0039-style provenance (`UNIQUE (source,
external_ref)`) so a future carrier/monitoring ingest merges idempotently. Read-only to
web (render) and to agents (Ozzie reads inventory for turn-up/cutover; Vance reads it for
the deadline watch's circuit context). **Dormant / propose-only until built** (ADR-0136 A5c).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (`ON DELETE SET NULL`) — the served client; NULL = Imperion's own |
| `carrier_contract_id` | uuid | FK → `carrier_contract` (`ON DELETE SET NULL`) — the agreement it rides on (nullable) |
| `circuit_ref` | text | the carrier's circuit id / ckt id (NOT NULL, indexed) |
| `carrier_name` | text | denormalized provider (when no contract linked) |
| `site_name` | text | served site/location label (free text — no silver site entity yet) |
| `service_address` | text | service/demarc address (business address, not personal data) |
| `service_type` | enum `circuit_service_type` | `dia` · `broadband` · `fiber` · `mpls` · `sdwan` · `wavelength` · `dark_fiber` · `sip_trunk` · `pri` · `pots` · `wireless` · `other` |
| `bandwidth_down_mbps` / `bandwidth_up_mbps` | integer | ≥ 0 |
| `status` | enum `circuit_status` | `ordered` · `installing` · `active` · `degraded` · `pending_disconnect` · `disconnected` · `unknown` |
| `ordered_date` / `install_date` / `disconnect_date` | date | lifecycle dates; `install_date` = turned up + cutover verified |
| `mrc` | numeric(12,2) | per-circuit monthly recurring cost (rollup on the contract) |
| `source` / `external_ref` | text | provenance; `UNIQUE (source, external_ref)`; default `curated` |
| `notes` | text | short operational notes — never secrets or client verbatim |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

## Joins

- `account_id` → `account` (the served client; NULL = Imperion's own).
- `carrier_contract_id` → [`carrier_contract`](carrier_contract.md) — the commercial half
  (term/renewal/cancel clock, Vance).
- Live circuit → `cmdb_ci` link via the OP-04-13 path + a Felix working ticket on turn-up
  (reconcile, A9c); cost reconcile → Vance (Stream 07).

## Notes

data_class **`operational`** (CMDB-adjacent broad-read). No PII: circuit ids, site labels,
bandwidths, and dates only. No row-level values appear in this doc — resolve specifics
against the live read-only DB. Migration 0254
([#1651](https://github.com/markdconnelly/ImperionCRM/issues/1651)).
