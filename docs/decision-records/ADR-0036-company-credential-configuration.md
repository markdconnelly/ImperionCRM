# ADR-0036: Company credential configuration in Settings

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem

The platform needs an admin-facing way to configure the company-wide integration
credentials the (deferred) backend ingestion/sync engines will use: Microsoft GDAP
delegated admin for Imperion, the Autotask API, the IT Glue API, the My IT Process
API, the Kaseya Quote Manager (quoting) API, and the Televy API (assessment
reporting). Before this change the only credential UI was per-user OAuth connects on
`/integrations`; there was no way to enter or rotate company credentials, and the
`connection_provider` enum lacked My IT Process, Televy, the quote manager, and GDAP.

## Context

`connection` (ADR-0012/0024) already models company- and user-scope connections and
carries `keyvault_secret_ref` — a reference only, never the secret (CLAUDE.md §5).
Heavy integration logic, real token exchange, and Key Vault writes are deliberately
deferred to the isolated backend repo (ADR-0028), reached from this repo only via
`src/lib/services/external-client.ts`, which degrades gracefully when an endpoint is
not yet configured.

## Options considered

1. **Write to Key Vault directly from this front-end** (add `@azure/keyvault-secrets`,
   grant the App Service managed identity vault RBAC).
2. **Delegate the Key Vault write to the backend** via `external-client`, storing only
   the returned reference here.
3. **Stub only** — UI + reference naming, no real write path.

## Tradeoffs

- (1) works end-to-end today but puts secret-handling in the front-end App Service, a
  deviation from ADR-0028 isolation.
- (2) keeps all secret-handling in the network-isolated backend and matches every other
  deferred flow; the UI is fully built now and lights up when the backend ships.
- (3) is fastest but leaves no contract for the backend to implement against.

## Decision

- Add a **tabbed Settings page** (Profile · Your connections · Company credentials).
  Personal connects move here from `/integrations`; `/integrations` now redirects to
  `/settings?tab=connections` and is removed from the left nav.
- A **Company credentials** tab renders one card per provider. Secret fields are
  **write-only** (password inputs, never pre-filled or echoed back).
- **Key Vault writes are delegated to the backend** (option 2): `credentialsService`
  (`src/lib/services/index.ts`) POSTs entered fields to the backend, which writes the
  secret and returns a `keyvaultSecretRef`. Only that reference + status are persisted
  here via `connections.saveCompanyCredential` (upsert by provider for company scope).
- **GDAP is an admin-consent flow**, not a pasteable key: a "Grant admin consent"
  button that begins the Microsoft consent flow (stubbed this phase, like other OAuth).
- Migration `0033` extends `connection_provider` (`myitprocess`, `televy`,
  `quotemanager`, `gdap`), adds a `pending` `connection_status`, and a partial unique
  index `uq_connection_company_provider` so re-saving rotates rather than duplicates.

## Security impact

The secret never touches this DB or this App Service — only a Key Vault reference is
stored (CLAUDE.md §5). Secret-handling stays inside the network-isolated backend
(ADR-0028). UI inputs are write-only; stored secrets are never returned to the client.

## Cost impact

None new — reuses the existing `INTEGRATION_SERVICE_URL` backend descriptor and Key
Vault. No new dependency added to the front-end.

## Operational impact

Until the backend `/credentials` and `/gdap/consent` endpoints exist, saves degrade
gracefully: the row is recorded `pending` with the intended reference and the card
reflects that, so nothing crashes. Migration 0033 must be applied to prod as a deploy
step (0001–0032 already applied). *(0033 applied & verified 2026-06-08.)*

## Future considerations

Wire the backend credential store + Key Vault write; complete the real Entra GDAP
admin-consent redirect; surface live connection health (last sync, token expiry) on the
cards once the sync engines run.
