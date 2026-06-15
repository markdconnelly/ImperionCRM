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
  `m365_contacts` (directory) · `apollo_contacts` (enrichment, lowest).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` |
| `full_name` | text | |
| `email` / `phone` | text | personal — see notes |
| `title` / `headline` / `location` | text | enrichment-fed |
| `crm_stage` | enum | sales/CRM stage |
| `lifecycle_status` | text | normalized lifecycle (ADR-0031) |
| `is_client` | bool | converted-client flag; `signed_at` stamps conversion |
| `campaign_id` | uuid | FK → `campaign` (attribution) |
| `pii` | bool | row carries personal data |
| `last_enriched_at` | timestamptz | |

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
