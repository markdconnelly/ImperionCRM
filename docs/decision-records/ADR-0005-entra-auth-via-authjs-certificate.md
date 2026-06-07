# ADR-0005: Web auth via Auth.js with Entra certificate client assertion

- **Status:** Accepted (verified; see ADR-0009 for the bundling fix required to
  make `customFetch` fire in production)
- **Date:** 2026-06-06

## Problem
Implement the user sign-in flow for the web app against Entra ID (ADR-0002),
choosing both a library and a client-authentication mechanism.

## Context
Next.js App Router, server-side auth (CLAUDE.md §2). "Mythos Proof" posture
(§5) discourages shared secrets, and the repository is currently public, so a
leaked secret would be high-impact. An Entra app registration already exists in
the Imperion LLC tenant, with a certificate uploaded to it.

## Options considered
- **Library:** Auth.js v5 (NextAuth) Entra provider vs. Microsoft MSAL
  (`@azure/msal-node`).
- **Client auth:** client secret vs. certificate client assertion
  (`private_key_jwt`).

## Tradeoffs
- Auth.js gives idiomatic App Router session/middleware handling with far less
  boilerplate than MSAL; it is a library, not a third-party IdP, so ADR-0002
  holds (Entra remains the sole IdP).
- Auth.js's Entra provider authenticates with a **client secret** by default and
  has no turnkey certificate support, so certificate auth requires custom code:
  the app signs a JWT assertion (with the `x5t` header Entra requires) and
  injects it into the token request via the provider's `customFetch` hook.
- A certificate means **no shared secret exists** to leak — materially better for
  a public repo and the security posture — at the cost of that custom glue and
  certificate lifecycle management (rotation, Key Vault in production).

## Decision
Use **Auth.js v5** with the Microsoft Entra ID provider, authenticating via a
**certificate client assertion** (no client secret). The signing key comes from a
PFX referenced only by environment variables (gitignored locally; Key Vault /
App Service certificate in Azure).

## Security impact
- Eliminates shared-secret credentials for the confidential client.
- Private key never enters source control (`*.pfx`/`*.pem`/etc. gitignored).
- Assertions are short-lived (~10 min) and single-use (`jti`).
- Sign-in is enforced by middleware before any data view renders (§7.3).

## Cost impact
No additional licensing. Adds `jose` and `node-forge` dependencies.

## Operational impact
- Certificate rotation must be tracked (current cert valid to 2027-06-06).
- Production must source the PFX/key from Key Vault, not a file path.
- The `customFetch` integration is version-sensitive across Auth.js betas and
  must be re-verified on upgrades.

## Future considerations
- Move to **workload identity federation / managed identity** for the App
  Service confidential client to remove the certificate entirely in production.
- Per-environment and per-consumer certificates (separate cert for automation /
  Graph app-only access) as the integration surface grows.
