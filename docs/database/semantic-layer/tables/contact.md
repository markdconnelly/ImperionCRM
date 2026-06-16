---
type: Silver Table
title: contact
description: Unified person — one row per individual, merged from five bronze sources by precedence; the CRM 360 subject.
resource: ../../../decision-records/ADR-0039-per-source-bronze-tables.md
tags: [silver, crm, contact, merge]
timestamp: 2026-06-15T00:00:00Z
---

# contact

The silver person record — the subject of the contact-360 (dossier, timeline, consent,
composer). Governed by
[ADR-0039](../../../decision-records/ADR-0039-per-source-bronze-tables.md) (merge) and
[ADR-0031](../../../decision-records/ADR-0031-normalized-contact-lifecycle.md)
(lifecycle); union view `contact_bronze_all`.

## Source of record / authority

Five bronze sources merge; **precedence `website` > `autotask` > `itglue` > `m365` >
`apollo`**. Each field from the highest-precedence source that has it; website rows are
pre-linked (resurrection guard — the merge never creates a contact from one).

- `website_contacts` (manual, highest) · `autotask_contacts` · `itglue_contacts` ·
  `m365_contacts` (directory; precedence label `m365_synced`) · `apollo_contacts`
  (enrichment, lowest).

## Bronze match / merge

How the sources collapse to one person (Pipeline `contact-matcher`); the owning account
resolves first through the same-source company bronze row (`companyExternalRef`):

1. **Email match** (confidence `0.95`) — a source row joins an existing contact when its
   `email` matches (case-insensitive) any contact's.
2. **Name match** (`0.6`) — else case-insensitive `full_name` equality **within the owning
   account** (`account_id`).
3. **Create** (`1.0`) — else a new contact is inserted (name/account/email/phone); website
   rows are app-created and pre-linked, so the merge never creates a contact from one (the
   resurrection guard).

Once linked, each contact is **recomputed** from all its linked source rows by the
precedence above; merged fields = `full_name`, `email`, `phone`, `title`, `headline`,
`location`. `last_enriched_at` is bumped when an `apollo` or `m365_synced` source
contributes.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (ON DELETE CASCADE) |
| `full_name` | text | merged by precedence |
| `email` / `phone` | text | personal — see notes; `email` is the primary match key |
| `title` / `headline` / `location` / `avatar_url` | text | enrichment-fed (ADR-0025) |
| `crm_stage` | enum | `audience` · `lead` · `prospect` · `client` (default `audience`; sales/CRM axis, ADR-0027) |
| `lifecycle_status` | text | enrichment lifecycle (ADR-0025) — `stranger` · `known` · `engaged` · `customer` (default `stranger`); a DIFFERENT axis from `crm_stage` |
| `is_client` | bool | trigger-derived = (`crm_stage` = `client`); `signed_at` stamped on transition |
| `signed_at` | timestamptz | conversion timestamp; nulled when no longer a client |
| `attribution` | jsonb | campaign/ad/utm (ADR-0012) |
| `campaign_id` | uuid | FK → `campaign` (attribution; ON DELETE SET NULL) |
| `pii` | bool | row carries personal data (default `true`) |
| `last_enriched_at` | timestamptz | bumped on apollo/m365 contribution |

## Joins

- `account_id` → `account`; `campaign_id` → `campaign`.
- Related: `consent_event` (the send gate), `contact_enrichment` (dossier facts +
  lawful basis), `contact_social_identity`, `credential_exposure`, `interaction`.
- **Entra directory-group enrichment** (Pipeline #93): the contact's Entra group
  membership is folded onto `contact_enrichment` as a `directory_groups` fact. Path:
  `m365_group_members.member_external_id = m365_contacts.external_ref` (the Entra user
  object id) → silver `contact` via `m365_contacts.contact_id`; the group name resolves
  through `m365_groups (tenant_id, external_id = group_external_id)`. Bronze feed:
  `m365_groups` / `m365_group_members` (migration 0079; front-end #257). The fact carries
  `source = 'm365_directory'` (its own idempotency key) and `lawful_basis =
  'legitimate_interest'`.

## Notes

Contacts are personal data (`pii = true` by definition). Name/email/phone and dossier
values — including `directory_groups` group names — are PII; never inline row-level
values, resolve against the live read-only DB.
