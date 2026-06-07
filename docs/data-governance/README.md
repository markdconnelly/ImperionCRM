# Data Governance

Data classification, retention, lifecycle, and governance policies.

See `CLAUDE.md` section 8 and the project standards doc for required fields.

## Lawful basis & consent (ADR-0014/0025/0026)

Imperion CRM assembles a contact "360" dossier and runs outbound/ad programs against
it. Holding and using that data is governed by two controls:

- **Lawful basis per fact.** Every `contact_enrichment` row carries a `lawful_basis`
  (`consent | legitimate_interest | contract | public_data`) and a `source` /
  `source_connection_id`, so *why* we hold each fact is auditable. `observed_at` and
  optional `expires_at` bound its lifetime.
- **Append-only consent ledger.** `consent_event` records every opt-in/opt-out per
  contact × channel (`email | sms | call_recording | data_enrichment | ad_targeting`)
  with timestamp, source, and proof. It is **never updated or deleted** — a change of
  mind is a new event. Current consent is the derived `current_consent` view.

**Gates (enforced in the data layer):**
- Outbound email/SMS is blocked unless `current_consent` for that channel is `opt_in`
  (`consent.canSend`).
- Ad targeting of an audience member is blocked unless `ad_targeting` is `opt_in`
  (`consent.canUseForAds`; `campaigns.launchAudience` filters non-consenting members
  and surfaces them rather than silently dropping).

## Classification & PII

- Contacts, enrichment facts, social identities, raw bronze payloads, and consent
  records are **PII / PII-adjacent**; access is audit-logged (ADR-0016).
- Raw third-party payloads land in `*_bronze` JSONB; large artifacts go to object
  storage via `blob_ref`, not the row.

## Retention (open items)

Per-jurisdiction retention rules, automatic `expires_at`-driven purge of stale
enrichment, and a contact-facing preference center are tracked as future work in
ADR-0025/0026.
