---
type: Silver Table
title: reference
entity: reference
archetype: B
description: Consent-gated captured customer proof (testimonials/reviews/reference-cases/logo-use) on a solicit→consent→capture lifecycle.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, marketing, advocacy, consent]
data_class: client_pii
timestamp: 2026-06-29T00:00:00Z
---

# reference

Captured, consenting customer proof — a client's **testimonial**, **review**,
**reference_case**, or **logo_use** — produced on a **solicit→consent→capture**
lifecycle. App-native silver (archetype B), born here; part of epic
[#1696](../../architecture/data-and-automation-doctrine.md) (decision D4). The defining
invariant is the **hard consent precondition**: a reference cannot reach `captured` or
`published` without a recorded consent (`reference_consent_required`, D4).

## Source of record / authority

**Imperion app-native** for the reference definition and lifecycle. The **consent is
authoritative** — `consent_event_id` is the recorded basis (who approved, when, the scope
of use); capture happens **only post-consent**. **Celeste owns the client touch** (the
solicit/consent conversation); **Belle never contacts the client** — Belle captures only
AFTER consent is recorded and is approval-gated server-side. Logo/name-use rights are
`always_gate`, human, marketing-owned.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `kind` | enum `reference_kind` | `testimonial` · `review` · `reference_case` · `logo_use` |
| `account_id` | uuid | FK → `account` (`ON DELETE CASCADE`) — the client source |
| `contact_id` | uuid | FK → `contact` (`ON DELETE SET NULL`) |
| `opportunity_id` | uuid | FK → `opportunity` (`ON DELETE SET NULL`) |
| `campaign_id` | uuid | FK → `campaign` (`ON DELETE SET NULL`) |
| `status` | enum `reference_status` | `candidate` · `consent_pending` · `consented` · `captured` · `published` · `withdrawn` (default `candidate`) |
| `consent_event_id` | uuid | FK → `consent_event` (`ON DELETE SET NULL`) — recorded client consent; required before `captured`/`published` (D4) |
| `consent_scope` | text | scope of use approved (e.g. 'name+logo on website case study') |
| `spawns_content_asset_id` | uuid | FK → `content_asset` (`ON DELETE SET NULL`) — the `case_study` it backs |
| `captured_body` | text | verbatim approved client words, consent-clean |
| `captured_by` | text | provenance: agent_key or human who captured |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**Constraint:** `reference_consent_required` — `CHECK (status NOT IN ('captured','published')
OR consent_event_id IS NOT NULL)`: the hard precondition (D4).

## Joins

- `account_id` → `account` (client source); `contact_id` → `contact`;
  `opportunity_id` → `opportunity`; `campaign_id` → `campaign`.
- `spawns_content_asset_id` → `content_asset` (the case_study it backs);
  `content_asset.backed_by_reference_id` → `reference` is the bidirectional back-link.
- `consent_event_id` → `consent_event` (the recorded consent basis).

## Notes

This entity **HOLDS `client_pii`** at runtime — client names, verbatim client words
(`captured_body`), and the consent scope. data_class is `client_pii` (**always-gate**).
Logo/name-use rights are `always_gate`, human, **marketing-owned**. No PII values appear in
this doc — resolve specific values against the live read-only DB.
