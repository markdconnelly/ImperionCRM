# Integration marketplace — connector registry (ADR-0076, #414)

The **connector registry** is the declarative, first-party marketplace foundation
(ADR-0076, epic #322): connectors are described by a uniform **manifest** so they can be
browsed, enabled, and configured consistently — replacing the bespoke per-integration
wiring. This page documents the **foundation slice (#414)**: the manifest format in code
+ the `connector_instance` persistence, plus the **catalog GUI (#416)** built over them.
The backend connect/custody/first-sync is **#149**; pipeline poll registration is **#116**.

> First-party only (#314). No third-party connector publishing / external developer API —
> that is the explicitly out-of-scope AppExchange-scale ecosystem (a future ADR if ever).

## Two halves: manifest (code) + instance (DB)

ADR-0076 §1/§2 splits a connector into a **manifest** (what a connector *is*) and an
**instance** (a connector *enabled in a scope*):

| | Manifest | Instance |
|---|---|---|
| Lives in | **Code** — `src/lib/integrations/connector-manifest.ts` (versioned, diffable) | **DB** — `connector_instance` (migration 0125) |
| Source of truth for | The catalog: auth type, scopes, default cadence, identity-map, capabilities | Per-scope config + lifecycle status |
| Why | "Manifests are versioned in code; the registry is the catalog's source of truth" (ADR-0076 §1) | One row per enabled connector per account scope |

`connector_instance.connector_key` references a manifest **by key**, validated against the
in-code registry **at the app layer** (`isKnownConnector`), NOT by a DB FK — exactly as
`report_definition.root_object` references the in-code semantic registry (ADR-0075/#410).

## Manifest format

```ts
interface ConnectorManifest {
  key: string;                 // stable; referenced by connector_instance.connector_key
  label, description, category, icon;
  authType: "oauth" | "jwt" | "api_key";
  scopes: string[];            // requested scopes (display/audit + recorded grant)
  defaultCadenceMinutes: number;   // ADR-0038 units; 0 = on-demand / not polled
  identityMap: string[];       // silver entities this maps (ADR-0012)
  capabilities: string[];      // "ingest:* | write:* | enrich:*"
  version: number;             // bumped in code when the declared shape changes
}
```

Helpers (pure, edge-safe): `listConnectorManifests()`, `getConnectorManifest(key)`,
`isKnownConnector(key)`, `effectiveCadenceMinutes(key, override)`.

**v1 registry:** `m365` (Productivity), `autotask` (PSA, write-back capable), `itglue`
(Documentation), `meta` (Marketing), `darkwebid` (Security), `apollo` (Enrichment,
on-demand). Keys match `company-providers.ts` where the connector also has a
company-credential form — that file declares how the **credential is collected**
(ADR-0036); this declares the **marketplace shape**. Distinct concerns, shared key.

## Instance lifecycle (ADR-0076 §3, backend-orchestrated)

```
available → connecting → connected → first_sync → polling
                                                    ↘ error
```

Enabling a connector upserts a `connector_instance` for `(connector_key, account_scope)`
and sets it to `connecting`; the **backend** drives the rest and stamps
`status`/`health`/`last_sync_at`; the **pipeline** reads the cadence (override or manifest
default) + `last_sync_at` to register the poll (ADR-0038).

Data-layer accessors (`ConnectorRepository`, interface + postgres + mock):
`listConnectorInstances`, `getConnectorInstance`, `getConnectorInstanceByKey`,
`enableConnector` (upsert→connecting), `setConnectorStatus`, `setConnectorCadence`,
`disableConnector`.

## Catalog GUI (#416, ADR-0076 §4)

The catalog is the admin marketplace surface at **`/connectors`** (admin-only —
`canSeeConnectors`, the same nav + route gate as Settings / CMDB, ADR-0030). It joins
the in-code manifest registry (the "available" catalog) to the persisted
`connector_instance` rows (the "connected" state) via the pure view-model
`buildConnectorCatalog()` (`src/lib/integrations/connector-catalog.ts`), grouped by
category. Each card shows the connector's status badge, capabilities, auth type,
effective poll cadence, last sync and (non-secret) health.

- **Enable** (available → records lifecycle intent): the `settings:write`-gated
  `enableConnectorAction` upserts the instance to `connecting`. It does **not** collect a
  credential — the backend completes the connect + Key Vault custody (#149), and the
  credential itself is entered under **Settings → Company credentials** (`company-providers.ts`,
  ADR-0036). A page notice states this explicitly.
- **Configure** (connected): `setConnectorCadenceAction` sets/clears the per-instance
  poll-cadence override (blank = manifest default, ADR-0038); `disableConnectorAction`
  removes the instance.

All three mutations are gated by `settings:write` (admin — the capability that owns
connections, company credentials and poll cadence), enforced fail-closed in
`src/app/(app)/connectors/actions.ts`. **No secret ever passes through this surface.**

## Security

- **No secret material in the row** (ADR-0034/0036/0043) — credentials are custodied in
  **backend Key Vault**; the catalog GUI collects and hands off, never stores. The
  `connector_instance` row holds only non-secret config + status; no client PII.
- **Least-privilege grants:** web identity SELECT/INSERT/UPDATE/DELETE (catalog GUI);
  backend SELECT/UPDATE (orchestrates lifecycle); pipeline SELECT (reads cadence). The
  manifest registry, being code, holds no grants or secrets.
- **App-native config, not silver tier** — like `saved_view` / `report_definition`; no
  OKF semantic-layer concept file applies.

## Status / not in this slice

- Catalog GUI (browse available vs connected, enable/configure, health) — **#416 (shipped)**.
- Backend connect → token custody → first sync — **#149** (unblocked: migration 0125 prod-applied).
- Pipeline poll registration from the manifest cadence — **#116**.
- Migrating existing bespoke connectors onto the lifecycle — incremental (ADR-0076
  consequence: "the registry can launch with a subset and grow").

## References

- ADR: [`../decision-records/ADR-0076-integration-marketplace.md`](../decision-records/ADR-0076-integration-marketplace.md)
- Schema: [`../database/data-model.md`](../database/data-model.md) → *Integration marketplace — connector_instance*
- Code: `src/lib/integrations/connector-manifest.ts`, `db/migrations/0125_connector_instance.sql`
