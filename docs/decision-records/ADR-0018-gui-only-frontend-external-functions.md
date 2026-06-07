# ADR-0018: GUI-only frontend; logic in the database or external functions

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem
Define what this repository is responsible for as the surface area grows
(integrations, agentic workloads, enrichment, comms, campaigns). Without a clear
boundary the Next.js app accretes heavy, long-running, secret-bearing logic that is
hard to scale, secure, and test.

## Context
Imperion CRM is the authoritative user interface (CLAUDE.md §2). Much of the
platform's work is long-running or integration-heavy: M365/Autotask/IT Glue/Plaud
ingestion, Facebook campaign calls, web-scrape enrichment, agent orchestration,
nurture sends. These do not belong in request/response web handlers.

## Decision
**This repository is the GUI.** Anything the app "does" resolves one of two ways:
1. **Interact with the database** directly through the repository abstraction
   (ADR-0007) — reads/writes against PostgreSQL (e.g. accounts, timeline). Direct
   DB access from server components/route handlers is allowed and expected.
2. **Call an external function or API** hosted on a separate object (Azure
   Functions, container apps, or other services) through a typed **service client**
   in `src/lib/services/`. Heavy/long-running/integration/secret-bearing logic
   lives there, not in this repo.

The app therefore contains: UI, thin server actions/route handlers, the data-access
layer, and **thin typed clients** to external services — and not the
implementations of those services. Service clients are placeholders until their
external endpoints exist; they fail closed (a clear "not configured" error) so the
GUI degrades gracefully.

## Options considered
- **Monolith** (all logic in the Next.js app) — rejected: couples UI deploys to
  long-running work, bloats cold starts, complicates secret handling and scaling.
- **GUI + DB + external functions** (this decision) — clean separation, independent
  scaling/deploy of workloads, smaller attack surface in the public web tier.

## Security impact
The public web tier holds fewer secrets and less privileged logic. External
functions hold their own integration credentials (Key Vault) and run with their own
identities; the GUI calls them over authenticated APIs. Smaller blast radius for the
internet-facing app (CLAUDE.md §5).

## Cost impact
Separate hosting for functions/services, scaled independently (often cheaper than
keeping the web tier warm for background work). No new cost until those services are
built.

## Operational impact
Each external service is documented, versioned, and deployed on its own cadence. The
service-client layer centralizes base URLs, auth, timeouts, and retries. The
modular monolith principle (CLAUDE.md §2) still holds — decompose by workload, not
prematurely.

## Future considerations
Define each external service's API contract (OpenAPI) under `docs/api`; choose the
host per workload (Azure Functions for event/integration glue, container apps for
the agent runtime). Revisit if a workload is light enough to live inline.
