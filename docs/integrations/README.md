# Integrations

Per-integration docs (M365/Graph, Autotask, IT Glue, My IT Process): owners, auth, rate limits, data exchanged, retry, monitoring.

See `CLAUDE.md` section 8 and the project standards doc for required fields.

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

## Lead-capture hooks (ADR-0024)

`lead_hook` + `lead_capture_event` pull new people into the system (web form, Facebook
lead, YouTube comment, LinkedIn message, inbound email, QR). A resolved capture
creates/links a contact, which starts enrichment and nurture.
