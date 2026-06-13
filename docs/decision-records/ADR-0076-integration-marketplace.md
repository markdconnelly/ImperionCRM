# ADR-0076: Integration marketplace — declarative connector registry

| Field | Value |
|---|---|
| **Repo** | frontend (manifest schema + catalog GUI); backend (connect / token custody / first sync); pipeline (poll registration) |
| **Status** | Accepted (2026-06-12, merged to main; scope locked with Mark; lowest priority of the parity set) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0012 (integration identity map / ingest-poll), ADR-0038 (per-connection poll cadence), ADR-0035 (Apollo enrichment integration), ADR-0034/0043 (front end never holds provider keys), ADR-0036 (company credential configuration), ADR-0042 (division of labor) |
| **Epic** | #322 · Parent #314 |

## Problem

An `/integrations` page exists, but each integration (M365, Autotask, Meta, Apollo, DarkWebID, …) is wired bespoke. There is no **marketplace** — a registry where connectors are described uniformly, browsed, enabled, and configured self-serve. The majors have AppExchange / HubSpot Marketplace. Note (#314): the **third-party-ecosystem** AppExchange is explicitly out of scope; this epic is the **internal, first-party** version — make our own connectors discoverable, self-enableable, and consistently lifecycled.

## Context

- **The plumbing already exists, ad-hoc.** Identity map + ingest/poll (ADR-0012), per-connection poll cadence (ADR-0038), credential configuration (ADR-0036), and concrete connectors (e.g. Apollo ADR-0035). What is missing is a **uniform description** of a connector and a catalog over them — not a new integration runtime.
- **Front end never holds provider keys (ADR-0034/0043).** Enable/configure must custody credentials in **backend Key Vault**; the catalog GUI collects and hands off, never stores.
- **Scope is first-party.** No third-party publishing, no external developer surface — that is the excluded AppExchange-scale ecosystem.

## Options considered

- **A. Keep bespoke per-integration code, add a static list page.** Cheapest, but every connector stays inconsistent (different enable flow, cadence handling, identity mapping) and "add a connector" has no shape. Rejected — does not deliver the marketplace value.
- **B. Declarative connector manifest + registry over the existing plumbing (chosen).** Each connector declares a manifest (auth type, scopes, default poll cadence, identity-map shape, capabilities); a catalog renders the registry; a uniform connect→custody→first-sync→poll lifecycle replaces the bespoke flows. Reuses ADR-0012/0038, adds consistency, not a new engine.
- **C. Adopt a third-party iPaaS (Workato/Zapier-style).** Powerful, but another system in the data path holding credentials + customer data, and off-strategy vs first-party custody. Rejected.

## Decision

1. **Connectors are declared by a manifest (B).** A `connector` manifest declares: key, display metadata, **auth type** (OAuth/JWT/API-key), required **scopes**, **default poll cadence** (ADR-0038), **identity-map shape** (ADR-0012), and **capabilities** (what it ingests / writes). Manifests are versioned in code; the registry is the catalog's source of truth.

2. **A connector instance is per-company configuration.** Enabling a connector creates a `connector_instance` (status, scopes granted, cadence override) whose **credentials live in backend Key Vault** (ADR-0034/0036) — never in the frontend or the instance row.

3. **One uniform lifecycle, backend-orchestrated (ADR-0042).** `available → connecting → connected → first-sync → polling` (and `error`). The backend runs connect → token custody → first sync; the pipeline registers the poll from the manifest cadence (ADR-0038). Existing bespoke connectors are migrated onto this lifecycle incrementally.

4. **Catalog GUI.** Browse available vs connected connectors, see capabilities + status, enable/configure (handing credentials to the backend), and see last-sync/health. This replaces the bespoke `/integrations` wiring with a registry-driven view.

5. **First-party only (#314).** No third-party connector publishing or external developer API in scope; revisiting that requires a new ADR (it is the excluded AppExchange-scale ecosystem).

**Table sketch (manifest in code; instances in DB; migration number at implementation):**

```sql
-- connector manifest: a versioned code artifact (key, auth_type, scopes,
-- default_cadence, identity_map_shape, capabilities[]) — not a DB table.
connector_instance (
  id, connector_key text,            -- references a manifest
  account_scope text,                -- per-company / global
  status text check (status in ('available','connecting','connected','first_sync','polling','error')),
  granted_scopes jsonb, cadence_override interval null,
  last_sync_at timestamptz, health jsonb,
  -- NO secret material here; credentials live in backend Key Vault (ADR-0034/0036)
  created_at, updated_at, ...
)
```

## Consequences

- "Add a connector" becomes a manifest + adapter, not a bespoke vertical — consistent enable flow, cadence, identity mapping, and health across all integrations.
- Existing connectors migrate onto the lifecycle incrementally; the registry can launch with a subset and grow.
- Lowest priority of the parity set (#314) — sequence after the revenue/service epics.

## Future considerations

- Connector health/observability dashboard on the BI hub (ADR-0062).
- Third-party connector publishing + a developer surface — explicitly out of scope now; a future ADR if ever pursued.
- Manifest-driven write capabilities (beyond ingestion) as more connectors gain write-back (cf. ADR-0074 Autotask write-back).
