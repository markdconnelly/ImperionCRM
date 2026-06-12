# Application boundary — what lives in this repo

- **Status:** Active (ADR-0018)
- **Related:** [product-requirements](./product-requirements.md), ADR-0007, ADR-0018

**This repository is the GUI for Imperion CRM.** It renders the interface and does
exactly two kinds of work; anything else is hosted elsewhere.

## In this repo (the GUI)

- **UI** — Next.js App Router pages, React components, theme.
- **Thin server layer** — server components, server actions, route handlers, and the
  Entra auth gate. Server actions follow guard → parse → repo call; form-field
  coercion lives in ONE shared grammar, [`src/lib/form-data.ts`](../../src/lib/form-data.ts)
  (#189) — new forms import it rather than re-implementing `str`/`orNull` locally.
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

## The call-guard seam (#190)

Every server action that crosses this boundary goes through ONE seam instead of
hand-rolled catch blocks:

- `src/lib/services/call-guard.ts` — `callServiceWithFallback<T>` folds a failed
  backend call into a `ServiceOutcome` with a ready-to-render message, under a single
  error taxonomy: **not_configured** (base-URL env unset OR a clean backend 501 — the
  same condition to a user, resolved here once), **rejected** (any other non-2xx),
  **unreachable** (network/timeout). `not_configured` is an expected deployment state
  (ADR-0018 graceful degradation) and is never logged; the rest are logged under the
  caller's label. `isBackendNotConfigured`/`classifyServiceError` serve the
  fire-and-forget callers (merge nudge, refresh actions).
- `src/lib/services/acting-user.ts` — `resolveActingUser()`, the one session-email →
  `app_user.id` resolution backend processes are scoped/audited by (backend
  ADR-0036/0037/0039), with a discriminated reason (`no_session` / `no_database` /
  `not_provisioned`) so each caller keeps its own degradation posture.

The seam is the test surface (`call-guard.test.ts`, `acting-user.test.ts`); new
backend-calling actions must use it rather than catching `ServiceCallError` directly.

## Why (ADR-0018)
Keeps the internet-facing web tier small and low-privilege, lets workloads scale and
deploy independently, and concentrates integration secrets in the external services
(Key Vault) rather than the GUI. See ADR-0018 for the full rationale.
