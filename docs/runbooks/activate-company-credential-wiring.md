# Activate company-credential wiring (Easy Auth + MI token)

**Trigger:** the front-end MI-bearer-token code has shipped (ADR-0036, `external-client.ts`)
and you want saving a company credential in **Settings → Company credentials** to actually
write the secret to Key Vault and flip the row to `active` — instead of the current `error`
(the backend caller-auth fails closed without a verified caller).

**Done check:** saving e.g. Televy in the UI flips its card to **active** and
`az keyvault secret list --vault-name kv-imperioncrm-prd` shows `conn-company-televy`.

> ⚠️ These steps touch **production auth and infra**. Read each command before running.
> Run them yourself (you own `az`/Azure RBAC). Verify with the `show`/`list` commands.

## Identifiers (this environment)

| Thing | Value |
| --- | --- |
| Subscription | `7916a39b-7a6e-4292-9c1f-0135ec648450` |
| Tenant | `49307c12-1bb7-42e4-9c7c-43d2850bd8c6` |
| Resource group | `Imperion_CRM` |
| Web app | `imperioncrm` |
| Web app MI client id | `5efd13c7-2847-4d22-b3e4-6674013b73c7` |
| Backend Function App | `imperioncrmbackend` |
| Easy Auth app (audience) | `46f1077b-c93f-42da-abd4-192da13781ac` (existing SSO app — do **not** create a new one) |
| Key Vault | `kv-imperioncrm-prd` |

```bash
az account set --subscription 7916a39b-7a6e-4292-9c1f-0135ec648450
```

## 1. Enable Easy Auth on the backend Function App

Accept the web app's **v1** managed-identity tokens (issuer `https://sts.windows.net/<tenant>/`,
audience `api://46f1077b…`), reject everything else with **401**, and keep the platform
health probes anonymous.

```bash
# Microsoft provider: existing SSO app as the audience, v1 issuer (MI tokens are v1).
az webapp auth microsoft update \
  --resource-group Imperion_CRM --name imperioncrmbackend \
  --client-id 46f1077b-c93f-42da-abd4-192da13781ac \
  --issuer "https://sts.windows.net/49307c12-1bb7-42e4-9c7c-43d2850bd8c6/" \
  --allowed-token-audiences "api://46f1077b-c93f-42da-abd4-192da13781ac"

# Turn auth on, fail closed, and exclude the probes so the platform can reach them.
az webapp auth update \
  --resource-group Imperion_CRM --name imperioncrmbackend \
  --enabled true \
  --unauthenticated-client-action Return401 \
  --excluded-paths "/api/health" "/api/ready"
```

Verify:

```bash
az webapp auth show --resource-group Imperion_CRM --name imperioncrmbackend \
  --query "{enabled:platform.enabled, action:globalValidation.unauthenticatedClientAction, \
            audiences:identityProviders.azureActiveDirectory.validation.allowedAudiences, \
            excluded:globalValidation.excludedPaths}"
```

**Gotchas**
- MI tokens are **v1** — the issuer must be `sts.windows.net/<tenant>/`, not `login.microsoftonline.com/<tenant>/v2.0`. A v2 issuer here will reject the MI token.
- The web app requests scope `api://46f1077b…/.default`, so the token `aud` is `api://46f1077b…` — it must appear in `allowedAudiences`.
- `ALLOWED_CALLER_CLIENT_ID` on the backend is already set to `5efd13c7…` (the web app MI), so caller-auth matches the token's `appid`. No change needed.

## 2. Point the web app at the audience (turns the token ON)

Until this is set, `external-client.ts` calls the backend **unauthenticated** (graceful —
no behavior change vs. today). Setting it makes the web app attach the MI bearer token.

```bash
az webapp config appsettings set \
  --resource-group Imperion_CRM --name imperioncrm \
  --settings INTEGRATION_SERVICE_AUDIENCE="api://46f1077b-c93f-42da-abd4-192da13781ac"
```

> The token requester is `AZURE_MANAGED_IDENTITY_CLIENT_ID` (already set on the web app to
> `5efd13c7…`, reused from the Postgres path). No new identity is introduced.

**If token acquisition 401s** (some tenants enforce app-role assignment for client-credentials
to a custom API), grant the web app MI an app role on the Easy Auth app, then retry:

```bash
# Expose an app role on app 46f1077b… (e.g. "Caller"), then assign the web app MI SP to it.
# az ad app … / az rest role assignment — see Entra portal → App registrations → 46f1077b…
```

## 3. Verify end-to-end

1. In the UI: **Settings → Company credentials → Televy** → paste a key → Save.
2. Expect the card to flip to **active** with a Key Vault reference.
3. Confirm the secret landed:

```bash
az keyvault secret list --vault-name kv-imperioncrm-prd \
  --query "[?starts_with(name,'conn-company-')].name" -o tsv
```

4. Re-saving the same provider should **rotate in place** (one row per provider —
   `uq_connection_company_provider`), not create a duplicate.

## 4. (Later) GDAP admin consent

The front-end callback at `/api/gdap/callback` is built and flips the `gdap` row to
`active` on a successful return. It stays dormant until the backend hands back a real
consent URL. To light it up:

- Register/confirm the partner multi-tenant app + GDAP relationship in **Partner Center**.
- On the **backend**, set `GDAP_CLIENT_ID`, `GDAP_REDIRECT_URI`
  (`https://imperioncrm.azurewebsites.net/api/gdap/callback`), `GDAP_TENANT` so
  `/api/gdap/consent` returns a live URL.
- (Optional, recommended) pin the returning tenant on the **web app**:

```bash
az webapp config appsettings set \
  --resource-group Imperion_CRM --name imperioncrm \
  --settings GDAP_EXPECTED_TENANT="49307c12-1bb7-42e4-9c7c-43d2850bd8c6"
```

- TODO(backend): once the `state` embedded in the consent URL is finalized, match it in
  the callback (currently the callback guards with an auth session + the
  `gdap_consent_pending` cookie).

## Rollback

- Unset the audience to immediately stop attaching tokens (calls go back to unauth → `error`):
  `az webapp config appsettings delete -g Imperion_CRM -n imperioncrm --setting-names INTEGRATION_SERVICE_AUDIENCE`
- Disable backend auth: `az webapp auth update -g Imperion_CRM -n imperioncrmbackend --enabled false`
  (re-opens the endpoints — only do this if caller-auth alone is acceptable as a stopgap).
