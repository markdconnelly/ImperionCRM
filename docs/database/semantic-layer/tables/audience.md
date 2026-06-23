---
type: Silver Table
title: audience
entity: audience
archetype: B
description: A paid-media ad-targeting set that syncs OUT to ad platforms (Meta/Google) for delivery, carrying a platform audience id. Distinct from a CRM segment. Website system of record; consent-gated.
resource: ../../../decision-records/ADR-0026-demand-gen-audiences-and-ad-consent.md
tags: [silver, marketing, audience, ad-targeting, paid-media, demand-gen]
data_class: client_pii
timestamp: 2026-06-23T00:00:00Z
---

# audience

A **paid-media ad-targeting set**: a grouping of [`contact`](contact.md) rows assembled to
be **synced OUT to an ad platform** (Meta / Google) for ad delivery, carrying the platform's
returned audience id. It is the delivery-side object a [`campaign_send`](campaign_send.md) or
ad campaign targets. Born silver — website system of record (app-native). Governed by
[ADR-0026](../../../decision-records/ADR-0026-demand-gen-audiences-and-ad-consent.md).

**Distinct from a [`segment`](segment.md)** (ADR-0073). A `segment` is an **internal** CRM
contact set used for journey enrollment / comms / list-views that **never leaves the
system**. An `audience` is the **outbound** paid-media object that **syncs to an ad
platform** and carries a `platform_sync_ref`. The two are deliberately separate tables with
separate lifecycles — internal grouping vs ad delivery.

## Source of record / authority

**Website system of record, app-native, born silver** (ADR-0042). The front end authors the
audience (create/edit, define membership) and reads it; the sync process pushes its members
to the ad platform and stores the returned `platform_sync_ref`. `kind` distinguishes a
**static** audience (an explicit, fixed member list) from a **dynamic** one (membership
materialized from the `definition` predicate, recomputed). Ad-targeting membership is
**consent-gated** — `current_consent` governs who may be targeted for ads (ADR-0026); a
contact who has not consented to ad targeting is excluded from the synced set.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | display name |
| `description` | text | optional |
| `kind` | enum `audience_kind` | `static` (explicit members) \| `dynamic` (materialized from `definition`) |
| `definition` | jsonb | the membership predicate (dynamic only; NULL for static) |
| `platform_sync_ref` | text | the ad platform's returned audience id (nullable until synced) |
| `created_by_user_id` | uuid | FK → `app_user` |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- Children: [`audience_member`](audience_member.md) (`audience_id` → here) — the explicit
  membership.
- Targeted by [`campaign_send`](campaign_send.md) (`audience_id`) and ad campaigns.
- `created_by_user_id` → [`app_user`](app_user.md): who curates the audience.
- Members reference [`contact`](contact.md) via `audience_member`; a dynamic audience is
  computed FROM contact fields (via `definition`) but materialized into member rows.

## Notes

An audience is built **to be sent to a third-party ad platform**, so its membership is
client-identifying and consent-sensitive — the gate (ADR-0026) is load-bearing, not
cosmetic. Member contact identity stays on [`contact`](contact.md); keep specific membership
out of this doc and resolve against the live read-only DB (CLAUDE.md §8). Explicitly **not**
a CRM [`segment`](segment.md).
