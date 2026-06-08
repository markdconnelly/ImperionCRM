# Integrations

Per-integration docs (M365/Graph, Autotask, IT Glue, My IT Process): owners, auth, rate limits, data exchanged, retry, monitoring.

See `CLAUDE.md` section 8 and the project standards doc for required fields.

> **Back-end & pipeline work the front end now expects:**
> [`frontend-driven-backend-requirements.md`](./frontend-driven-backend-requirements.md)
> tracks the deferred engines (RBAC claim, OAuth + Key Vault, ingestion → bronze,
> normalization → silver, enrichment, Televy + 365→GDAP, onboarding auto-checks) for
> the `ImperionCRM-Backend` repo (ADR-0028).

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

### Secrets

OAuth tokens are **never** stored in the database — `connection.keyvault_secret_ref`
points at the Azure Key Vault secret that holds them (CLAUDE.md §5). Live OAuth flows,
token storage, and background sync run in external functions (ADR-0018); the current
scaffold records connections and the identity map only.

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
