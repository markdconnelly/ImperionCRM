# Application boundary — what lives in this repo

- **Status:** Active (ADR-0018)
- **Related:** [product-requirements](./product-requirements.md), ADR-0007, ADR-0018

**This repository is the GUI for Imperion CRM.** It renders the interface and does
exactly two kinds of work; anything else is hosted elsewhere.

## In this repo (the GUI)

- **UI** — Next.js App Router pages, React components, theme.
- **Thin server layer** — server components, server actions, route handlers, and the
  Entra auth gate.
- **Data access** — the repository abstraction (`src/lib/data`, ADR-0007). The GUI
  reads/writes **PostgreSQL** directly through it (`src/lib/db`, managed-identity
  connection). This is allowed and expected.
- **Service clients** — thin, typed clients in `src/lib/services` that *call*
  external functions/APIs. The clients live here; the implementations do not.

## Not in this repo (hosted on separate objects)

Heavy, long-running, integration-heavy, or secret-bearing work runs as external
functions/APIs (Azure Functions, container apps, …) and is reached via the service
clients:

| Service client (`src/lib/services`) | Hosts | Base-URL env |
| --- | --- | --- |
| `agentService` | Orchestrator + sub-agents (ADR-0015) | `AGENT_SERVICE_URL` |
| `integrationService` | M365 / Autotask / IT Glue / Plaud / Facebook sync (ADR-0012) | `INTEGRATION_SERVICE_URL` |
| `enrichmentService` | Web-scrape lead intel (ADR-0012) | `ENRICHMENT_SERVICE_URL` |
| `commsService` | Email/SMS sends + nurture (ADR-0014) | `COMMS_SERVICE_URL` |
| `campaignService` | Facebook campaigns + analytics (ADR-0012) | `CAMPAIGN_SERVICE_URL` |
| `boardService` | AI Board of Directors sessions (ADR-0015) | `BOARD_SERVICE_URL` |

Until a service's base-URL env var is set, its client throws
`ServiceNotConfiguredError` and the UI degrades gracefully — so the GUI can ship
ahead of the backends.

## Decision flow for new functionality

```
Does the feature need heavy/long-running/integration/secret work?
        │
        ├─ No  → implement in the GUI: a server action/route handler that reads or
        │        writes PostgreSQL through the repository abstraction.
        │
        └─ Yes → implement it as an external function/API (separate object) and add
                 a typed method to the matching client in src/lib/services.
```

## Why (ADR-0018)
Keeps the internet-facing web tier small and low-privilege, lets workloads scale and
deploy independently, and concentrates integration secrets in the external services
(Key Vault) rather than the GUI. See ADR-0018 for the full rationale.
