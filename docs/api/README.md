# 🧩 API

The contracts between the web app, external functions, and integrations.

[← Documentation library](../README.md)

## Shape

```mermaid
flowchart LR
    APP["Web app<br/>(server actions · route handlers)"] --> DAL["Repositories"]
    APP --> FUNC["External functions<br/>(integration · enrichment · sends · agent)"]
    FUNC --> EXT["M365 / Kaseya / ad platforms"]
```

Most reads/writes go through **server actions + the repository layer** (no public REST
surface for core CRUD). External functions expose the integration/enrichment/agent
endpoints the app calls.

## What belongs here

- An **OpenAPI spec** + an endpoint catalog for the external-function surface.
- Per endpoint: purpose · inputs · outputs · validation · dependencies · security.

> Status: **server actions + the repository layer are built and live** (real CRUD and
> reads against PostgreSQL). The **external-function** surface (OAuth ingestion, real
> sends, enrichment, the agent runtime) is stubbed (`src/lib/services`) and **fails
> closed** until it lands — document each external endpoint here as it does.

Governing decisions:
[ADR-0018 GUI-only frontend](../decision-records/ADR-0018-gui-only-frontend-external-functions.md) ·
[ADR-0012 integration identity map](../decision-records/ADR-0012-integration-identity-map-ingest-poll.md)
