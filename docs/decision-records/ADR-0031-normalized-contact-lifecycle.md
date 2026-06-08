# ADR-0031: Normalized contact object & lifecycle pipeline

- **Status:** Accepted
- **Date:** 2026-06-08

## Problem
Leads and Contacts were modelled separately (Leads filtered `account` rows by stage;
Contacts listed all `contact` rows). The business view is one person who is a **lead
until they sign a contract**, then a **client contact** — and management wants to see
the whole book of business move along Audience → Lead → Prospect → Managed Services
Client on an interactive Pipeline.

## Context
The `contact` table is the spine (ADR-0010/0025) and already carries an enrichment
`lifecycle_status` (stranger|known|engaged|customer). The previous Pipeline page
visualised **opportunities** by sales stage. Lead capture lands in
`lead_capture_event` (ADR-0024) and resolves to a `contact`.

## Options considered
1. One normalized `contact` object with a dedicated CRM-lifecycle axis; Leads and
   Contacts are opposite filters of it; the Pipeline visualises that axis
   (this decision).
2. Keep two separate models and sync them (rejected — duplication, drift, two sources
   of truth for one person).
3. Overload the existing `lifecycle_status` for the CRM funnel (rejected — conflates
   the enrichment signal with the sales funnel; they move independently).

## Tradeoffs
- (1) a single source of truth; "promote a lead" is just a stage change; the Pipeline
  becomes a real management view. Cost: a second lifecycle axis to explain, and the
  Pipeline's meaning shifts from deals to contacts (the deal board is retained as a
  secondary view).
- (2)/(3) cheaper edits but structurally weaker.

## Decision
- Migration **`0027`** adds `contact.crm_stage`
  (`audience|lead|prospect|client`), `is_client`, and `signed_at`, with a trigger that
  keeps `is_client`/`signed_at` derived from `crm_stage` (callers write only
  `crm_stage`). Existing `lifecycle_status` is untouched — a **two-axis** model.
- **Leads** = `is_client=false`; **Contacts** = `is_client=true`. A shared
  `PeopleToggle` flips between the two routes; lead-capture tooling stays on Leads.
- The **Pipeline** is reworked to the contact lifecycle board (Audience → Lead →
  Prospect → Managed Services Client), interactive via `setContactStage`; the
  opportunity/deal board is kept below it.
- Repositories add `listContactsByStage` (optional client filter; omit = all stages
  for the board) and `setContactStage`, plus `listContacts({client})` for the rich
  CRUD list. Types: `ContactCrmStage`, `ContactPipelineRow`.

## Security impact
No new PII surface; same `contact` access controls (ADR-0016). Revenue shown on the
deal board is redacted for Support (ADR-0030).

## Cost impact
Negligible — three columns, one index, one trigger.

## Operational impact
Migration `0027` backfills `crm_stage` from `lifecycle_status` so the views are
populated. The "contract signed" transition sets `crm_stage='client'` (the trigger
stamps `signed_at`), moving the person from Leads to Contacts automatically.

## Future considerations
Inherit the signed lead's full dossier into the client contact record; per-stage SLAs
and aging; automated stage advancement from engagement signals; a dedicated
"mark signed" action wired to proposal acceptance.
