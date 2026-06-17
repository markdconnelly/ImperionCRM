---
adr: 0007
title: "Repository abstraction for data access"
status: accepted
date: 2026-06-06
repo: frontend
summary: "Typed async repository contracts in `src/lib/data` with mock and PostgreSQL implementations behind one seam."
tags: [topology]
---
# ADR-0007: Repository abstraction for data access

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-06 |
| **Cross-references** | — |

## Problem

The UI imported mock fixtures directly. We need a seam that lets the data source
change (mock → PostgreSQL + pgvector, ADR-0003) without rewriting callers, and
that fits the bronze/silver/gold pipeline (CLAUDE.md §4) and the future agent
orchestrator (§7.5).

## Context

CLAUDE.md §7.4 calls for "a typed data-access layer; replace mock data on the
Dashboard with real queries behind a repository abstraction." Components were
coupled to `lib/mock-data`, so swapping in a database would touch every view.

## Options considered

- Keep importing fixtures / call the DB directly from components.
- A **repository abstraction**: typed interfaces, swappable implementations,
  resolved by a single server-only provider.

### Tradeoffs

Direct imports are simplest but couple UI to the data source and can't host
server-side queries cleanly. The repository layer adds a thin indirection but
gives one swap point, keeps server-only data code out of client bundles, and
makes the eventual Postgres/gold reads a drop-in.

## Decision

Introduce `src/lib/data`:
- `repositories.ts` — async typed contracts (`DashboardRepository`,
  `AgentRepository`, `Repositories`).
- `mock/mock-repositories.ts` — fixture-backed implementation.
- `index.ts` — `getRepositories()`, server-only, the single selection point
  (returns mock now; Postgres when `DATABASE_URL` is set).

Views call `getRepositories()` server-side and pass plain data to presentational
components.

## Consequences

### Security impact

- `index.ts` is `server-only`; data-access code never reaches the client bundle.
- Centralizes where row-level scoping / Entra-permission filtering will be
  enforced as the gold layer and RBAC land.

### Cost impact

None (no new dependencies).

### Operational impact

Methods are async, ready to become real queries; switching data sources is a
one-line change in `index.ts`.

## Future considerations

- Postgres-backed implementation (ADR-0003) reading the gold layer (§4).
- Vector/semantic retrieval and agent-memory repositories.
- Per-request scoping to the signed-in user's Entra permissions.
