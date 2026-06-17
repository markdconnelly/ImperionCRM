---
adr: 0009
title: "Bundling-resilient certificate `customFetch` hook"
status: accepted
date: 2026-06-06
repo: frontend
summary: "Wrap the Entra provider in a Proxy so the certificate `customFetch` hook survives production bundling."
tags: [platform]
---
# ADR-0009: Bundling-resilient certificate `customFetch` hook

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-06 |
| **Cross-references** | — |

## Problem

After the certificate-based Entra sign-in (ADR-0005) was deployed, SSO failed on
the public site: completing Microsoft login landed the user on Auth.js's generic
**"There is a problem with the server configuration"** page. Local typecheck and
build passed; the certificate, PFX, app registration, redirect URIs, and App
Service settings were all confirmed correct.

## Context

Auth.js v5 (`next-auth@5.0.0-beta.25` → `@auth/core@0.37.2`) has no turnkey
certificate support for the Entra provider, so ADR-0005 injects a signed client
assertion into the token request via the provider's `customFetch` hook. That hook
is attached with a symbol: the app sets `provider[customFetch]`, where
`customFetch` is re-exported from `"next-auth"` (which re-exports it from
`@auth/core`). At the token exchange, `@auth/core` reads `provider[S]` using its
own internal `Symbol("custom-fetch")`.

Root cause (reproduced and verified against the live deployment):

- The token exchange returns **no `id_token`**, so jose throws *"JWTs must use
  Compact JWS serialization, JWT must be a string"*, surfaced as
  `CallbackRouteError` → the "server configuration" page.
- Direct protocol tests proved the certificate itself is valid: an assertion
  built from the deployed PFX authenticates to Entra and receives a token. So the
  failure was in application code, not configuration.
- Instrumenting the deployed bundle showed `entraFetch` **never runs** during the
  callback — Auth.js silently falls back to plain `fetch`, so the request carries
  only the placeholder `clientSecret` (`client_secret_basic`) and Entra rejects
  client auth (`invalid_client`).
- The deployed bundle defines `Symbol("custom-fetch")` **twice** (a second copy
  is emitted into the edge/middleware bundle). Because `Symbol()` mints a new
  unique symbol on each evaluation, the symbol the app sets is **not identical**
  to the one `@auth/core` looks up. The property lookup misses.

## Options considered

1. **Proxy the provider** so any `Symbol("custom-fetch")` access returns
   `entraFetch`, independent of symbol identity.
2. **`serverExternalPackages`** in `next.config` to stop Next from bundling
   `next-auth`/`@auth/core` (force a single runtime instance from
   `node_modules`).
3. **First-party token-exchange proxy route** that performs the certificate
   exchange server-side, bypassing `customFetch` entirely.
4. **Native `private_key_jwt`** via `token.clientPrivateKey` — rejected:
   `@auth/core@0.37.2`'s assertion modifier only sets `aud`, never the `x5t`
   header Entra requires, so it cannot authenticate to Entra.
5. **Patching global `fetch`** — rejected: oauth4webapi uses a bundled `fetch`
   reference, so a `globalThis.fetch` wrapper does not intercept the token
   request (confirmed empirically).

### Tradeoffs

- Option 1 is a small, self-contained change in `auth.ts`, proven against the
  live deployment, and degrades gracefully (if symbol identity is ever fixed by a
  build change, the Proxy still serves the correct hook). It depends on
  `@auth/core` reading `provider[customFetch]` directly (true in 0.37.2).
- Option 2 addresses the root cause more "correctly" but was unverifiable in this
  environment and risks changing the standalone trace / runtime resolution.
- Option 3 is the most robust but the largest change (a new route, careful
  passthrough of the token response shape).

## Decision

Adopt **Option 1**. Build the Entra provider, then wrap it in a `Proxy` whose
`get` trap returns `entraFetch` for any symbol whose `description` is
`"custom-fetch"`, and passes everything else through via `Reflect.get`. The
explicit `[customFetch]: entraFetch` is kept as well (harmless, and correct if a
future build makes the symbol identity match). Implemented in `src/auth.ts`.

## Consequences

### Security impact

- No change to the security model of ADR-0005: still certificate client
  assertion, no shared secret, sign-in still enforced by middleware.
- Restores the intended posture by making the certificate path actually execute;
  before the fix, client authentication was effectively broken (failing closed —
  sign-in was denied, not bypassed).

### Cost impact

None. No new dependencies; one `Proxy` allocation at module load.

### Operational impact

- The `customFetch` integration remains version-sensitive (ADR-0005). On Auth.js
  / Next.js upgrades, re-verify a real sign-in. If `@auth/core` stops reading
  `provider[customFetch]` directly (e.g. it deep-clones the provider), revisit
  with Option 2 or 3.
- A short diagnostic procedure (Kudu command API via AAD bearer token; replaying
  the token request against Entra to isolate client-auth vs. code) is recorded in
  the runbooks for future auth incidents.

## Future considerations

- Prefer **Option 2 or 3** as a cleaner long-term fix if the Proxy proves fragile
  across upgrades.
- Move to **workload identity federation / managed identity** for the App Service
  confidential client (ADR-0005 future work), which removes the certificate — and
  this `customFetch` glue — entirely.
