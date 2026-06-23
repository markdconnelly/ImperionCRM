---
type: Silver Table
title: audience_member
entity: audience_member
archetype: B
description: Membership of a contact in a paid-media audience (composite PK audience+contact, idempotent). The set of people an ad audience syncs to an ad platform. Website system of record; consent-gated.
resource: ../../../decision-records/ADR-0026-demand-gen-audiences-and-ad-consent.md
tags: [silver, marketing, audience, membership, ad-targeting, demand-gen]
data_class: client_pii
timestamp: 2026-06-23T00:00:00Z
---

# audience_member

One [`contact`](contact.md)'s membership in an [`audience`](audience.md) — the join rows
that make up the people an ad audience syncs to a platform. Born silver — website system of
record (app-native, child of `audience`). Governed by
[ADR-0026](../../../decision-records/ADR-0026-demand-gen-audiences-and-ad-consent.md).

## Source of record / authority

**Website system of record, app-native.** The **composite primary key
`(audience_id, contact_id)`** makes membership idempotent: re-adding a contact is a no-op,
and a dynamic audience's recompute UPSERTs. `source` records how the row got there (e.g.
explicit add vs a dynamic-definition recompute), which lets a recompute scope its own rows
without disturbing explicitly-pinned members. Which members are actually pushed to the ad
platform is **consent-gated** — `current_consent` filters the synced set (ADR-0026); a
membership row existing does not mean the contact is delivered to the platform if consent is
absent.

## Schema

| Column | Type | Notes |
|---|---|---|
| `audience_id` | uuid | FK → `audience` (composite PK part) |
| `contact_id` | uuid | FK → `contact` (composite PK part) |
| `source` | text | how the row got here (explicit add vs dynamic recompute); lets a recompute scope its own rows |
| `added_at` | timestamptz | when the membership was added |

Composite PK `(audience_id, contact_id)` — one membership row per contact per audience; add
is idempotent, recompute upserts.

## Joins

- `audience_id` → [`audience`](audience.md): the owning targeting set; the members list of
  an audience reads here.
- `contact_id` → [`contact`](contact.md): the member; "which audiences is this contact in"
  reads the reverse.

## Notes

Membership is the **list of people targeted for ads on a third-party platform** — directly
client-identifying and consent-sensitive. The consent gate (ADR-0026) is load-bearing.
Contact identity stays on [`contact`](contact.md); keep specific membership out of this doc
and resolve against the live read-only DB (CLAUDE.md §8). Bounded by the contact base.
