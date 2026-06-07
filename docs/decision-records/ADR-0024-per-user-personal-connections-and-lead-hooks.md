# ADR-0024: Per-user personal connections & lead-capture hooks

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem
Employees want their own Microsoft 365, LinkedIn, and YouTube activity to flow into
the CRM so a contact's history is complete, and the business wants "hooks" that pull
a new person into the system the moment they interact (web form, Facebook lead,
YouTube comment, inbound email) and start building a profile. ADR-0012 modelled only
**company-wide** system connections (Autotask, IT Glue) — it has no notion of an
individual employee connecting a *personal* account.

## Context
Builds on the integration identity map and ingest/poll policy (ADR-0012) and the
unified timeline (ADR-0011). A comm is "related first to the employee, then to the
company": the employee who connected the source owns the ingestion, and the contact
and account it concerns are derived. Microsoft Entra remains the sole **identity**
provider (CLAUDE.md §3) — these are OAuth **data** connections, not sign-in IdPs, so
no third-party IdP is introduced.

## Options considered
1. One `connection` table with a `scope` of `user` | `company` (this decision).
2. Separate `user_connection` and `integration_connection` tables.
3. Personal data only via company connections (rejected — employees can't connect
   their own accounts).

## Tradeoffs
- (1) one table, one repository, one identity map; `owner_user_id` distinguishes a
  personal connection from a company one. Slightly more nullable columns.
- (2) duplicates the schema, the sync machinery, and the repository for no real gain.

## Decision
Adopt a single **`connection`** table with `scope` (`user`|`company`),
`owner_user_id` (null for company), `provider`, `scopes[]`, `status`, sync cursor,
and **`keyvault_secret_ref`** — the OAuth token lives only in Azure Key Vault and is
never stored in the database (CLAUDE.md §5). `interaction.source_connection_id` and
`interaction.owner_user_id` record which connection produced a comm and whose it is.
`external_identity` (from ADR-0012) is the identity map.

**Lead-capture hooks** are modelled as `lead_hook` (kind = web_form | facebook_lead |
youtube_comment | linkedin_message | inbound_email | qr | manual) and
`lead_capture_event` (raw `payload_bronze`, resolving to a contact). A resolved
capture creates/links a contact, which starts enrichment (ADR-0025) and nurture
(ADR-0027).

This scaffold records connections and captures; **real OAuth flows, token storage in
Key Vault, and live ingestion run in external functions** (ADR-0018) in a later phase.

## Security impact
Tokens never touch the DB — only a Key Vault reference. Personal connections are
least-privilege (declared `scopes[]`) and per-employee revocable (`status`,
disconnect deletes the row). Ingested personal/social data is PII and access-logged
(ADR-0016). Building profiles on people is gated by lawful basis + consent
(ADR-0025) before any outbound or ad use.

## Cost impact
Negligible storage. API volume and Key Vault operations accrue when live ingestion is
wired (out of scope here).

## Operational impact
Adds migrations `0020` (connection + external_identity, wires the deferred
`interaction.source_connection_id` FK) and `0022` (lead hooks). A `connections`
repository (per-user + company lists, connect/disconnect, identity map) and a `leads`
repository (hooks + capture inbox) carry the contracts; the Integrations UI follows.

## Future considerations
Live OAuth + Key Vault token storage; background sync workers and per-connection
health/backoff; automatic contact creation from a raw capture payload; webhook-driven
captures; per-provider scope catalogs.
