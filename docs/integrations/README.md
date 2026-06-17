# Integrations

Per-integration docs (M365/Graph, Autotask, IT Glue, My IT Process): owners, auth, rate limits, data exchanged, retry, monitoring.

- [`mileiq-api.md`](./mileiq-api.md) — MileIQ External API access model (request-gated, OAuth 2.1 per-user vs Teams-group beta) + open questions before provisioning (#522, ADR-0083).
- [`connector-registry.md`](./connector-registry.md) — integration marketplace foundation (ADR-0076, #414): the in-code connector manifest format + `connector_instance` persistence (catalog GUI #416, backend custody #149, poll-reg #116).

See `CLAUDE.md` section 8 and the project standards doc for required fields.

> **Back-end & pipeline work the front end now expects:**
> [`frontend-driven-backend-requirements.md`](./frontend-driven-backend-requirements.md)
> tracks the deferred engines (RBAC claim, OAuth + Key Vault, ingestion → bronze,
> normalization → silver, enrichment, Televy + 365→GDAP, onboarding auto-checks) for
> the `ImperionCRM_Backend` repo (ADR-0028).

## Connection model (ADR-0012/0024)

A single `connection` table models two scopes:

- **`scope = 'user'` — personal connections.** Each employee connects their own
  account (M365, LinkedIn, YouTube, Facebook, Google, Plaud) so *their* comms flow
  into the timeline. An ingested comm is attributed **first to the employee**
  (`interaction.owner_user_id`, via `interaction.source_connection_id`) and then to the
  contact/account.
- **`scope = 'company'` — org-wide systems.** Autotask, IT Glue, and the org Graph app.

`external_identity` is the identity map correlating our account/contact to its IDs
across systems (augment, don't duplicate — ADR-0012).

### Ingest vs poll

- **Ingest → timeline:** M365 email/Teams, Plaud calls, SMS/WhatsApp, Facebook/
  YouTube/LinkedIn touches — written as `interaction` rows (bronze→silver→gold).
- **Poll, never duplicated:** Autotask tickets, IT Glue assets/docs — fetched live and
  referenced, never the system of record.

### Poll cadence (ADR-0038)

Each connection carries `poll_interval_minutes` — how often the pipeline should poll it
for new data. Operators set it per connection from a preset dropdown on the connection /
company-credential cards (Manual / 15 min / 30 min / hourly / 6 h / 12 h / daily), which
auto-saves. **`0` = manual / paused** (no automatic polling). This repo owns the column;
the `ImperionCRM_Pipeline` repo reads it and must honour `0` as paused.

### Secrets

OAuth tokens are **never** stored in the database — `connection.keyvault_secret_ref`
points at the Azure Key Vault secret that holds them (CLAUDE.md §5). Live OAuth flows
and token storage run in the backend (ADR-0018/0028, backend ADR-0038); background
sync is still deferred.

## Per-user OAuth flow (ADR-0024 + backend ADR-0038)

Settings → **Your connections** runs the real authorization-code flow for
`m365 | google | youtube | linkedin | facebook` (Plaud is key-based — no public OAuth —
and stays a recorded stub):

```mermaid
sequenceDiagram
    participant B as Browser
    participant W as Web app (this repo)
    participant F as Backend (ImperionCRM_Backend)
    participant P as Provider

    B->>W: Connect <provider> (connectAction, settings:write)
    W->>F: POST /connections/{provider}/start { userId }   (MI bearer)
    F-->>W: { authorizationUrl, state }
    W-->>B: redirect to authorizationUrl
    B->>P: consent
    P-->>B: redirect to /api/connections/{provider}/callback?code&state
    B->>W: GET callback route (session + settings:write required)
    W->>F: POST /connections/{provider}/callback { code, state }   (MI bearer)
    F-->>W: { connectionId, status: 'active' }  (tokens → Key Vault; row upserted)
    W-->>B: redirect /settings?tab=connections&connect=ok (notice)
```

- **`connectAction`** (`src/app/(app)/settings/actions.ts`) resolves the acting
  `app_user.id` from the session, calls `connectionsService.startOAuth`
  (`src/lib/services/index.ts` → `INTEGRATION_SERVICE_URL`, managed-identity bearer),
  and redirects the browser to the provider. Backend 501 / unset service URL →
  the previous stub row is recorded with a "not configured yet" notice — the page
  never breaks.
- **`/api/connections/[provider]/callback`** receives the provider redirect and
  forwards `code`+`state` server-side — the browser never talks to the backend and no
  token material passes through the web app. Provider `error=` (user cancelled) and
  invalid/expired `state` (the backend's one-time, Key-Vault-parked CSRF nonce) are
  surfaced as notices via `/settings?tab=connections&connect=<result>`.
- **`disconnectAction`** calls `POST /connections/{provider}/disconnect` FIRST — the
  backend deletes the Key Vault token secret (real revocation) and marks the row
  `revoked` (`connection_status` enum, migrations 0020/0033) — then removes the local
  row as before. If revocation fails unexpectedly the row is kept visible for retry.
- Pure flow logic + flag vocabulary live in `src/lib/integrations/personal-oauth.ts`
  (unit-tested).
- **Operator settings** (backend Function App): `OAUTH_REDIRECT_BASE_URL` =
  `https://imperioncrm.azurewebsites.net/api/connections` plus per-provider
  `OAUTH_<P>_CLIENT_ID` / `OAUTH_<P>_CLIENT_SECRET_SECRET` — see
  [`../operations/credential-wiring-next-steps.md`](../operations/credential-wiring-next-steps.md) §4b.

## Company credentials (ADR-0036)

Configured under **Settings → Company credentials**. One card per provider; secret
fields are write-only and never echoed back. The entered fields are POSTed to the
backend credential store (`credentialsService` → `INTEGRATION_SERVICE_URL`), which
writes the secret to Key Vault and returns the reference persisted on the company
`connection` row (`keyvault_secret_ref`). Re-saving rotates the credential (upsert by
provider, `uq_connection_company_provider`). Until the backend endpoint is wired, saves
record a `pending` row with a `kv://imperion/conn/<provider>` reference and degrade
without error.

| Provider (`connection_provider`) | Kind | Fields collected |
|---|---|---|
| `gdap` | Admin consent | none — "Grant admin consent" (Microsoft GDAP for Imperion) |
| `qbo` | OAuth connect | none — "Connect QuickBooks" (Intuit OAuth; see below) |
| `autotask` | Credential | API user, API secret*, API integration (tracking) code* |
| `itglue` | Credential | API key*, region (US/EU/AU) |
| `myitprocess` | Credential | API key* |
| `quotemanager` | Credential | API key*, tenant/account ID (Kaseya Quote Manager) |
| `televy` | Credential | API key* — assessment reporting |
| `meta` | Credential (**send-capable**) | Page access token*, Facebook Page ID — FB/IG DM replies |

\* write-only secret — stored in Key Vault, never returned to the client.

### Meta (Facebook / Instagram) send credential (`meta`, #586 / pipeline #89 PR #113)

`meta` is the first **send-capable** company credential: its long-lived Page access token
authorizes OUTBOUND Facebook & Instagram DM replies (`pages_messaging` /
`instagram_manage_messages`), not just ingest. The cloud pipeline reads it from Key Vault
(`conn-company-meta`, fields `pageAccessToken` + `pageId`) and stays **dormant / fail-closed**
until the secret exists (pipeline `credentials.ts`, issue #89). Because nothing *polls* a send
token, the card renders **no poll cadence and no Refresh button** (`sendCapable: true` →
`providerIsPollable` is false).

**Security gate.** Entering this token is a **Mark-approved security event**: Meta App Review /
Advanced Access for the messaging permissions must be granted before the token is valid, and
Mark approves before the field goes live. The field naming mirrors the pipeline's
`credentials.ts` exactly (`pageAccessToken`, `pageId`) so the two provider lists stay in sync.

> **Enum follow-up.** The company `connection` row written on save uses the
> `connection_provider` Postgres enum, which does not yet include `meta` (it is distinct from
> the per-user `facebook` ingest provider). Adding that enum value is a separate migration,
> tracked outside this PR (one migration per wave). Until it lands, saving the credential
> records a `pending` row only after the enum is extended; the Settings UI + field contract
> ship here independently.

### QuickBooks Online connect (`qbo`, OAuth — #528 / backend #117, ADR-0048/0085)

Read-only connection to Imperion's **own** QBO company — the authoritative payment fact for
time + expense reconciliation. `kind: "consent"`, but unlike GDAP it is a full OAuth
authorization-code flow handled by the backend (the app never writes to QuickBooks):

1. **Connect QuickBooks** → `connectQuickBooksAction` → `connectionsService.startQboConnect()`
   → backend `POST /connections/qbo/start` parks a one-time CSRF `state` in Key Vault and
   returns the Intuit consent URL → the admin is redirected to Intuit.
2. Intuit redirects back to **`/api/qbo/callback`** (= `QBO_REDIRECT_URI`) with
   `code`+`realmId`+`state`. The route (session + `settings:write`) forwards them to backend
   `POST /connections/qbo/callback`, which validates the state, exchanges the code, and writes
   the token set to `conn-company-qbo`. The `qbo` company row flips to `active`.
3. The backend then refreshes the access token on-demand forever; a dead refresh token is
   recovered by an admin **Reconnect** (re-run the flow) — there are no customers to prompt.

No cookie is used (the backend owns the CSRF state, mirroring the per-user OAuth flow).
Activation = backend app settings `QBO_CLIENT_ID_SECRET` / `QBO_CLIENT_SECRET_SECRET` /
`QBO_REDIRECT_URI` (+ `QBO_ENVIRONMENT`) and migration 0093 (`qbo` provider enum).

**Connect outcomes (#530).** Both the start action and the callback land on
`/settings?tab=credentials&qbo=<result>` (with `&qboStatus=<httpStatus>` when the backend
answered with an HTTP code), and the company-credentials tab renders a specific notice
instead of the row's bare `error`. Vocabulary + messages live in
`src/lib/integrations/qbo-connect.ts`:

| `qbo` code | When | Tone |
| --- | --- | --- |
| `ok` | token exchanged, row active | success |
| `start_not_configured` / `stubbed` | backend returned 501 (Intuit app not registered yet) | warning |
| `denied` | admin cancelled consent at Intuit | warning |
| `start_rejected` (+`qboStatus`) | `start` got a non-2xx from the backend | error |
| `exchange_failed` (+`qboStatus`) | callback: backend 502, Intuit refused the code exchange | error |
| `start_unreachable` | `start` got no usable answer (network/timeout) | error |
| `start_no_url` | `start` returned 200 but no consent URL | error |
| `invalid` | Intuit returned without `code`/`realmId`/`state` | error |
| `forbidden` | caller lacked `settings:write` | error |
| `error` | anything else | error |

Hard failures (`start_rejected` / `exchange_failed` / `start_unreachable`) are also
`console.error`'d server-side (App Service console logs) for triage — never with token
material.

Provider/field definitions: `src/lib/integrations/company-providers.ts`.

## Lead-capture hooks (ADR-0024)

`lead_hook` + `lead_capture_event` pull new people into the system (web form, Facebook
lead, YouTube comment, LinkedIn message, inbound email, QR). A resolved capture
creates/links a contact, which starts enrichment and nurture.
