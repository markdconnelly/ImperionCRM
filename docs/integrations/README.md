# Integrations

Per-integration docs (M365/Graph, Autotask, IT Glue, My IT Process): owners, auth, rate limits, data exchanged, retry, monitoring.

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
| `autotask` | Credential | API user, API secret*, API integration (tracking) code* |
| `itglue` | Credential | API key*, region (US/EU/AU) |
| `myitprocess` | Credential | API key* |
| `quotemanager` | Credential | API key*, tenant/account ID (Kaseya Quote Manager) |
| `televy` | Credential | API key* — assessment reporting |

\* write-only secret — stored in Key Vault, never returned to the client.

Provider/field definitions: `src/lib/integrations/company-providers.ts`.

## Lead-capture hooks (ADR-0024)

`lead_hook` + `lead_capture_event` pull new people into the system (web form, Facebook
lead, YouTube comment, LinkedIn message, inbound email, QR). A resolved capture
creates/links a contact, which starts enrichment and nurture.
