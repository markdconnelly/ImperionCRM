# Company credential configuration — wiring status & next steps

Tracks the cross-repo rollout of the Settings → Company credentials feature
(ADR-0030). Written 2026-06-08. **The UI is live; the secret-write path is secured
but not yet functional end-to-end** — the remaining work is the front-end→backend
authentication.

## Concrete identifiers (this environment)

| Thing | Value |
| --- | --- |
| Subscription | `7916a39b-7a6e-4292-9c1f-0135ec648450` (MCPP Subscription) |
| Tenant | `49307c12-1bb7-42e4-9c7c-43d2850bd8c6` (ImperionLLC.com) |
| Resource group | `Imperion_CRM` |
| Web app | `imperioncrm` (`imperioncrm.azurewebsites.net`) |
| Web app managed identity (client id) | `5efd13c7-2847-4d22-b3e4-6674013b73c7` (`mgid-imperioncrm-web-prd`) |
| Backend Function App | `imperioncrmbackend` (`imperioncrmbackend.azurewebsites.net`) |
| Backend managed identity | `mgid-imperioncrmbackendfunction` (client id `4a2edcaf-9d58-4566-8e3d-2229c6807dc6`) — **Key Vault Administrator** on the vault |
| Pipeline Function App | `imperioncrmpipeline` |
| Key Vault | `kv-imperioncrm-prd` (RBAC mode) |
| Postgres | `imperioncrm-pg-prd` / db `imperioncrm` |
| **Existing Entra app (SSO / token)** | `46f1077b-c93f-42da-abd4-192da13781ac` — **use this for Easy Auth audience; do NOT create a new one** |

## Done this session

- **Migration 0027 applied to prod & verified** — `connection_provider` += `myitprocess,
  televy, quotemanager, gdap`; `connection_status` += `pending`; index
  `uq_connection_company_provider`.
- **Merged & deployed:** front-end #41 (Settings tabs + credential UI), backend #2
  (`/api/credentials` + `/api/gdap/consent`), pipeline #3 (to-do doc), backend #3
  (functions switched to `authLevel: 'anonymous'`).
- **`INTEGRATION_SERVICE_URL`** set on the web app → `https://imperioncrmbackend.azurewebsites.net/api`.
- **`ALLOWED_CALLER_CLIENT_ID`** set on the backend → the web app MI client id
  (`5efd13c7…`). caller-auth now **fails closed**: any request without a verified
  `x-ms-client-principal` is denied (401). The credential endpoints are therefore
  **secured** even though Easy Auth isn't enabled yet.
- Backend `/api/credentials` + `/api/gdap/consent` routes confirmed registered (return
  401, gated).

## Current behavior (important)

`INTEGRATION_SERVICE_URL` is set, so the web app calls the backend on credential save.
caller-auth fails closed → the call returns **401** → the front-end records the company
`connection` row with **`status='error'`** (it still saves the row + reference; it does
not crash). This stays until the auth below is wired. _If a clean `pending` state is
preferred in the meantime, unset `INTEGRATION_SERVICE_URL` on the web app._

## Remaining tasks (follow-up sessions)

### 1. Enable Easy Auth on the backend — use the EXISTING app `46f1077b…`
- Configure App Service Authentication (v2) on `imperioncrmbackend`, Microsoft provider,
  **client id = `46f1077b-c93f-42da-abd4-192da13781ac`**, unauthenticated action
  **`Return401`**.
- **Exclude `/api/health` and `/api/ready`** (globalValidation.excludedPaths) so platform
  probes keep working.
- **Issuer/audience gotcha:** managed-identity tokens are **v1** (issuer
  `https://sts.windows.net/49307c12…/`). Set the allowed token issuer/audience to accept
  v1 tokens whose `aud` = the resource the web app requests (see step 2). Verify with a
  real MI token before relying on it.
- caller-auth checks the token's `appid`/`azp` against `ALLOWED_CALLER_CLIENT_ID`
  (`5efd13c7…`, already set) — the web app MI is the token requester, so its client id is
  what appears. ✔

### 2. Front-end: attach an MI bearer token (repo `ImperionCRM`)
- In `src/lib/services/external-client.ts`, acquire a token via `@azure/identity`
  `DefaultAzureCredential({ managedIdentityClientId: '5efd13c7…' })` for the backend
  audience (e.g. scope `api://46f1077b-c93f-42da-abd4-192da13781ac/.default` or the app's
  exposed resource), and add `Authorization: Bearer <token>` to `callService` requests.
  Cache the token (≈55 min). Add the audience as an env var (e.g.
  `INTEGRATION_SERVICE_AUDIENCE`).
- Grant the web app MI permission/consent to request that token if required.
- Deploy the web app.

### 3. Verify end-to-end
- Save a credential (e.g. Televy) in Settings → Company credentials. Expect:
  - backend `setSecret` writes `conn-company-televy` to `kv-imperioncrm-prd`;
  - the `connection` row shows **`status='active'`** with `keyvault_secret_ref`;
  - re-saving rotates (one row per provider via `uq_connection_company_provider`).
- `az keyvault secret list --vault-name kv-imperioncrm-prd` should show `conn-company-*`.

### 4. GDAP real admin-consent flow
- Register/confirm the partner multi-tenant app + GDAP relationship in Partner Center.
- Set `GDAP_CLIENT_ID`, `GDAP_REDIRECT_URI`, `GDAP_TENANT` on the backend (the
  `/api/gdap/consent` 501 becomes a live consent URL), and build the web-app consent
  callback that flips the `gdap` row to `active`.

### 5. Pipeline consumption
- Implement the per-provider ingest/poll in `ImperionCRM_Pipeline`
  (`docs/credential-pipeline-todo.md`): read `conn-company-<provider>` from Key Vault →
  bronze→silver→gold; write `connection.sync_cursor`/`last_sync_at`/`status` for live
  health on the Settings cards.

### 6. Hygiene
- Backend CD has hit intermittent **`409 Conflict` on ZipDeploy** when runs overlap; if a
  deploy hangs, a Function App restart clears the lock. Consider serializing deploys.
- Update the ERD in `docs/database/data-model.md` for the extended enums (ADR-0030).
