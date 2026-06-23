---
type: Silver Table
title: contact_enrichment
entity: contact_enrichment
archetype: B
description: Per-fact contact dossier (EAV) — one row per discovered attribute, each carrying confidence, provenance, and a lawful basis.
resource: ../../../decision-records/ADR-0025-contact-360-enrichment-and-lawful-basis.md
tags: [silver, crm, contact_enrichment, enrichment, consent]
data_class: client_pii
timestamp: 2026-06-22T00:00:00Z
---

# contact_enrichment

The **per-fact dossier** for a person — one row per discovered attribute (employer, role,
interest, tech stack, Entra `directory_groups`, …), each stamped with confidence, the
source it came from, and the **lawful basis** under which it was gathered. The
attribute-value layer of Contact-360 (the linkage layer is
[`contact_social_identity`](contact_social_identity.md)); governed by
[ADR-0025](../../../decision-records/ADR-0025-contact-360-enrichment-and-lawful-basis.md),
extending the consent ledger [ADR-0014](../../../decision-records/ADR-0014-consent-ledger-communications.md).
EAV shape mirrors `engagement_answer`.

## Source of record / authority

**App-native EAV; each fact is self-attributing.** No single external SoR — every row
records its own `source`, `source_connection_id`, `confidence`, and `lawful_basis`, plus
`observed_at` / `expires_at` for freshness. A consumer that needs "the current value of
attribute K" picks the **highest-confidence, most-recent, non-expired** row for
(`contact_id`, `attribute_key`). Idempotency for sync'd facts is the `source` label (e.g.
the Entra `directory_groups` fact carries `source = 'm365_directory'`, its own key —
re-merging replaces from source). **Lawful basis is a hard gate, not metadata:** a fact's
use for outreach/ads is bounded by its `lawful_basis` and the live
[`consent_event`](consent_event.md) state — *having* a fact is never consent to contact.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `contact_id` | uuid | FK → `contact` (ON DELETE CASCADE) |
| `attribute_key` | text | the fact name — `employer` · `role` · `interest` · `tech_stack` · `directory_groups` · … (open set) |
| `value_text` | text | scalar value (one of value_text/value_json set) — **may be personal data** |
| `value_json` | jsonb | structured value — **may be personal data** |
| `confidence` | numeric | 0..1; ranks competing facts for the same key |
| `source` | text | `linkedin` · `youtube` · `web` · `m365` · `manual` · `agent` · `m365_directory` · … ; the per-fact idempotency label |
| `source_connection_id` | uuid | FK → `connection` (ON DELETE SET NULL); which connected account produced it |
| `lawful_basis` | enum `lawful_basis` | `consent` · `legitimate_interest` (default) · `contract` · `public_data` — the GDPR-style basis the fact was gathered under |
| `observed_at` | timestamptz | when the fact was seen |
| `expires_at` | timestamptz | freshness cap; past this the fact is stale |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `contact_id` → `contact` (the 360 subject; `last_enriched_at` on `contact` is bumped
  when apollo/m365 contributes, ADR-0025).
- `source_connection_id` → [`connection`](connection.md) (provenance; the source→skill hop
  resolves through the source registry, ADR-0104).
- Gated by [`consent_event`](consent_event.md) → `current_consent` (the send/ads gate).
- **Entra directory-group enrichment** (Pipeline #93): a contact's Entra group membership
  is folded here as a `directory_groups` fact (`source = 'm365_directory'`, `lawful_basis
  = 'legitimate_interest'`); path detailed in [`contact`](contact.md) Joins.

## Notes

`value_text` / `value_json` are personal data by definition (the dossier IS personal
profile data). PII-free here; resolve specific values against the live read-only DB
(CLAUDE.md §8). Enrichment lives inside the lawful-basis + provenance guardrail — every
fact stamped `source` / `observed_at` / `lawful_basis`, use bounded by consent.
