---
adr: 0028
title: "Backend topology — separate repo, Azure Functions on the shared plan, network-isolated to the front end"
status: accepted
date: 2026-06-07
repo: frontend
summary: "The backend is a separate repo (`ImperionCRM_Backend`) of Azure Functions on the shared plan, isolated to the front end."
tags: [topology]
---
# ADR-0028: Backend topology — separate repo, Azure Functions on the shared plan, network-isolated to the front end

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

The deferred server-side work (live OAuth + ingestion, real sends, LLM enrichment,
embeddings/vector search, the orchestrator agent runtime) needs a home. We must decide
where its code lives, how it is hosted, and how it is reached — without breaking the
GUI-only-frontend rule (ADR-0018) or exposing a new public attack surface.

## Context

The web app is built and live (App Service, Entra SSO, PostgreSQL + pgvector, migrations
0001–0026). ADR-0018 already says heavy/integration logic belongs in external functions;
`src/lib/services/external-client.ts` is the stubbed call site. The CRM augments M365 +
Kaseya (ADR-0012) and treats security as a product feature (CLAUDE.md §5).

## Options considered

- **Backend in the web app repo (workspace) vs a separate repo.**
- **Hosting:** Consumption Functions / Premium / **Dedicated (same App Service Plan)** /
  Container Apps.
- **Exposure:** public Function App with keys vs **private (VNet) + front-end-only**.

### Tradeoffs

- *Same repo* keeps schema/contracts/ADRs/memory in one place (zero knowledge-transfer
  cost); *separate repo* gives independent ownership/scaling at the cost of a deliberate
  knowledge-sync discipline.
- *Same App Service Plan* co-locates compute (cost, simplicity); a private endpoint adds
  a small amount of network config but removes the public surface entirely.

## Decision

- **Separate repository** (`ImperionCRM_Backend`) for the backend, chosen for
  independent lifecycle/ownership. The repo split breaks Claude's per-project memory, so
  knowledge is carried explicitly: the backend repo's `CLAUDE.md` (mirrors what the front
  end built + the full task list) and this ADR are the source of truth; contract changes
  update **both** repos' `CLAUDE.md`.
- **Single source of truth for the schema stays in the front-end repo** (`db/migrations`,
  ADR-0017). The backend is a schema *consumer*; it never owns migrations.
- **Hosting:** an Azure **Function App on the same App Service Plan** as the web app
  (Dedicated hosting). Separate repo, shared compute — repo ≠ host.
- **Network isolation:** the Function App is **not internet-facing**. Both apps integrate
  a shared **VNet**; the Function App's public access is disabled and it is reached via a
  **private endpoint** (or inbound access restricted to the web app's integration
  subnet). **Only the front-end App Service can call it.**
- **Identity gating (defense in depth):** even on the private network, the caller
  presents the **web app's managed identity** (Function-level Entra auth). The browser
  never calls the backend — only the web app's server-side code (ADR-0018).
- **Runtime auth & secrets:** the Function App authenticates to PostgreSQL with its own
  **managed identity** (no stored password) and reads all secrets — including per-user
  OAuth tokens (`connection.keyvault_secret_ref`) — from **Key Vault**.

## Consequences

### Security impact

Removes the public attack surface (private network), and adds identity gating on top.
Tokens and secrets stay in Key Vault; DB auth is passwordless. Bronze raw payloads remain
PII-adjacent and access-controlled (ADR-0016). The separate repo gets its own
least-privilege OIDC deploy identity.

### Cost impact

Shared App Service Plan avoids a second always-on plan. VNet + private endpoint add minor
networking cost. LLM/API and ad-platform usage accrue as ingestion/enrichment land.

### Operational impact

Two repos to keep in sync via `CLAUDE.md` + ADRs. Independent CI/CD (OIDC deploy,
esbuild self-contained bundle). Migrations remain a separate, gated step in the front-end
repo. Per-connection health/backoff and audit/Sentinel observability in the backend.

## Future considerations

Promote `shared` (schema + contracts) to a published package or git submodule if the
surface grows; split the single Function App into per-workstream apps when scaling/
ownership justifies it (modular monolith → decomposition); webhook-driven ingestion.
