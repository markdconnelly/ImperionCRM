---
type: Silver Table
title: contact_social_identity
entity: contact_social_identity
archetype: B
description: One contact → many social-platform identities; the Contact-360 social linkage (handle, profile, follower count, verified).
resource: ../../../decision-records/ADR-0025-contact-360-enrichment-and-lawful-basis.md
tags: [silver, crm, contact_social_identity, enrichment]
timestamp: 2026-06-22T00:00:00Z
---

# contact_social_identity

A person's **linked presence on a social platform** — one row per (`contact`, `platform`).
Part of the Contact-360 enrichment surface (knowing the person before a salesperson talks
to them), governed by
[ADR-0025](../../../decision-records/ADR-0025-contact-360-enrichment-and-lawful-basis.md).
Distinct from the per-fact dossier [`contact_enrichment`](contact_enrichment.md): this is
the identity/handle linkage, that is the attribute facts.

## Source of record / authority

**App-native, single-SoR.** Rows are written by the social/enrichment connectors
(LinkedIn / YouTube / Facebook / X / Instagram) and by manual capture; authoritative per
(`contact_id`, `platform`). `verified` records whether the platform itself attests the
identity (not an internal trust flag). No external system owns the row; the platform is
the *source* of the captured fields, not the SoR of the linkage.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `contact_id` | uuid | FK → `contact` (ON DELETE CASCADE) |
| `platform` | text | `linkedin` · `youtube` · `facebook` · `x` · `instagram` · … (open set) |
| `handle` | text | the @handle / username — **personal data** |
| `profile_url` | text | public profile link — **personal data** |
| `external_id` | text | the platform's stable id for the person |
| `follower_count` | integer | audience size at last capture |
| `verified` | boolean | platform-attested identity (default `false`) |
| `raw` | jsonb | captured payload (lossless) |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `contact_id` → `contact` (the 360 subject; the contact also carries `headline` /
  `avatar_url` enrichment, ADR-0025).
- Related: [`contact_enrichment`](contact_enrichment.md) (dossier facts + lawful basis),
  `interaction` / social posts (a platform identity is the actor behind social
  engagement), and [`external_identity`](external_identity.md) for non-social provider links.

## Notes

`handle`, `profile_url`, and `raw` are personal data. PII-free here by design; resolve
specific values against the live read-only DB (CLAUDE.md §8). Use of social data for
outreach/ads is **consent-gated** via the dossier's `lawful_basis` and the
[`consent_event`](consent_event.md) ledger — having the linkage is never consent to contact.
