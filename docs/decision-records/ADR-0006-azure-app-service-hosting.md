# ADR-0006: Azure App Service as the hosting target

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-06 |
| **Supersedes** | the provisional Azure Static Web Apps recommendation in CLAUDE.md §7. |
| **Cross-references** | — |

## Problem

Choose the Azure hosting model for the Next.js application.

## Context

Microsoft-first posture (CLAUDE.md §2). An Azure Web App (`imperioncrm`) and a
GitHub Actions OIDC deploy pipeline (`.github/workflows/main_imperioncrm.yml`)
already exist and deploy `main` to the web app. The application needs first-class
server features: Next.js API routes, SSR, server-side Auth.js with certificate
signing, and a future server-side agent orchestrator (§7.5).

## Options considered

- **Azure App Service** (Web App, Node server) — already wired.
- **Azure Static Web Apps** — the provisional §7 default; SSR/API needs a linked
  Azure Functions backend.

### Tradeoffs

Static Web Apps is more managed and cheaper for static-first sites, but the
orchestrator and cert-based server auth want a long-running Node server; doing
that on SWA means splitting logic into a Functions backend. App Service runs the
Next.js Node server directly, matching the modular-monolith preference (§2.4),
and is already provisioned and deploying.

## Decision

Host on **Azure App Service** (Web App `imperioncrm`), deployed from `main` via
the existing OIDC GitHub Actions workflow. Inside the Azure perimeter, consistent
with the Microsoft-first posture.

## Consequences

### Security impact

- Deploy auth is OIDC federated credentials (no stored publish secrets).
- `main` auto-deploys to the web app, so only verified, building code may merge —
  feature work stays on branches until it passes typecheck/build/smoke test.
- Server secrets (Entra cert/key, DB URL) come from App Service settings / Key
  Vault references, never the repo.

### Cost impact

App Service plan cost vs. SWA's lower baseline; acceptable given the server-side
requirements.

### Operational impact

- Set `AUTH_TRUST_HOST`/`trustHost` for the reverse proxy.
- Configure all server env vars in App Service configuration.
- Reuse the existing build/deploy workflow.

## Future considerations

Revisit if the app decomposes into static front end + separate APIs, or if
managed identity / federated credentials replace the certificate in production.
