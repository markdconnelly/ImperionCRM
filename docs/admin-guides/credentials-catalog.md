# Credentials catalog (Settings → Credentials)

The **credential registry** (ADR-0103) — a governed, admin-only view of every credential the
system custodies in Azure Key Vault, at **Settings → Credentials** (`/settings/credentials`).

## What it shows

One row per `connection`, grouped by **scope**:

| Scope | Meaning |
|---|---|
| **Personal** (`user`) | An employee's own connection (their M365, social, etc.). |
| **Company** (`company`) | Imperion's own company systems (Autotask, IT Glue, the M365 enterprise app, …) — Imperion acting as its own first client. |
| **Client** (`client`) | A managed customer's connection, **linked to that customer's account**. |

Columns: the **Key Vault secret name**, the connection display name, provider, the linked
**account** (client scope) or owner (personal), the **auth method** (certificate / secret /
**api key** / OAuth), and status.

## What it never shows

**Secret values are never displayed.** Only the Key Vault secret *name* is surfaced, for
traceability. The token/secret itself lives only in Key Vault and never enters the database,
this page, or any log (CLAUDE.md §5, ADR-0103).

## Naming standard

Key Vault secret names follow `conn-<scope>-<provider>[-<tenantId|userId>]` — e.g.
`conn-client-<tenantId>-m365`, `conn-company-qbo`, `conn-user-<userId>-mileiq`. The standard
makes a mis-scoped or stray secret obvious at a glance.

## Registering a client tenant's M365 app (write half, #950)

The same page carries the **write** surface: *Register a client M365 tenant*. Per the
per-client-app model (ADR-0103 / backend ADR-0076), each managed client tenant has its
**own** Entra app registration — a distinct app (client) id and its own credential. An admin
registers one by entering:

- **Linked account** — the managed customer the credential serves;
- **Tenant id** and **App (client) id** — both GUIDs (the tenant's own app registration);
- **Auth method** — **Secret** (default) or **Certificate**;
- the credential itself: the **client secret** value (secret) **or** the 40-char hex
  **certificate thumbprint** (certificate).

On submit, the web app proxies the entry server-side to the backend custody endpoint
`POST /api/connections/client/m365` (backend #217; the browser never calls the backend —
ADR-0028/0035). The backend writes the secret to **Key Vault** under
`conn-client-<tenantId>-m365` and records the `client`-scope `connection` row; the entered
value is **never** returned, stored in this database, or logged (CLAUDE.md §5). A certificate
records only its thumbprint (the private key is custodied out of band). Re-registering the same
tenant **rotates** the credential in place, and the new row appears in the catalog above.

If the integration backend isn't configured in the environment (`INTEGRATION_SERVICE_URL`
unset), the form degrades to an honest notice and saves nothing.

> Scope note: this form is **M365-only**. Which `connection` column holds the app id (the
> cutover from the interim `external_account_id` onto `connection.client_id`) is backend #226 —
> transparent to this form, which only POSTs to the endpoint.

## Registering a client UniFi console (write half, #964)

Alongside the M365 form, the page carries the api-key twin: *Register a client UniFi console*.
A managed client's UniFi console authenticates by **API key** (`auth_method='api_key'`), not a
cert or secret. One account may map **many** consoles (many rows). An admin registers one by
entering:

- **Linked account** — the managed customer the console serves;
- **Console / site id** — the per-console natural key (alphanumerics/dashes, 1–64);
- **Connection type** — **Cloud** (UniFi's hosted Site Manager API at `api.ui.com`) is the
  **default**, recommended for most clients; **Console** (on-prem UniFi Network Integration API
  on the customer's controller) is the exception for clients without cloud access (#1276);
- **Controller host** — the console hostname/IP, **required for Console** and omitted for Cloud;
- the **API key** value (write-only).

On submit, the web app proxies server-side to the backend custody endpoint
`POST /api/connections/client/unifi` (backend #229/#233). The backend writes the key to **Key
Vault** under `conn-client-unifi-<consoleId>` and records the `client`-scope `unifi` `connection`
row, with the **non-secret** `connectionType`/`controllerHost` stored on
`connection.provider_config` (migration 0151). The key value is **never** returned, stored in
this database, or logged (CLAUDE.md §5). Re-registering the same console **rotates** the key in
place. The local-pipeline multi-console sweep (LocalPipeline #259) resolves each console's key
from this registry to poll its devices.

If the integration backend isn't configured (`INTEGRATION_SERVICE_URL` unset), the form degrades
to an honest notice and saves nothing.

## Related surfaces

- **Account page → Credentials panel** (#906) — the client connections for one account.
- **Settings → Client mapping (M365)** (`/settings/client-mapping/m365`, ADR-0112 — the M365
  instance of Client Mapping; supersedes the standalone `/settings/tenant-mapping`, which now
  redirects) — maps M365 Customer Tenants onto accounts (the registry the on-prem estate
  discovery enumerates) and registers per-client M365 credentials.
- **Settings → Client mapping (UniFi)** (`/settings/client-mapping/unifi`, #1273) — the UniFi
  instance: registers per-client UniFi console API keys and maps consoles onto accounts. Reached
  from its own Settings nav leaf (UniFi has no connector card on `/settings/connections` yet).
- Credential custody (write) is the backend's job; the on-prem pipeline authenticates the M365
  enterprise app by certificate or secret per this registry (BE #217, LP #234).

Access: admin-only (`canSeeSettings`, ADR-0030).
