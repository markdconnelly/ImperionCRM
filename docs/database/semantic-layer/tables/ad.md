---
type: Silver Table
title: ad
entity: ad
archetype: B
description: A single creative under a campaign — the unit ad-platform metrics attribute to. Website system of record (definition); platform object linked by external_ref.
resource: ../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md
tags: [silver, marketing, ad, campaign, demand-gen, social]
data_class: operational
timestamp: 2026-06-26T00:00:00Z
---

# ad

A single ad **creative** under a [`campaign`](campaign.md): the granular unit that platform
spend/impression/click/lead metrics attribute to. The campaign carries the platform and the
budget; the `ad` carries the creative and its own platform object id. Born silver — website
system of record for the definition; the ad platform feeds metrics. Governed by
[ADR-0053](../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md).

## Source of record / authority

**Website system of record** for the ad definition; `external_ref` links the platform's ad
object so platform-pulled [`campaign_metric`](campaign_metric.md) rows can attribute to this
exact creative. `creative` is a jsonb bag of the creative payload (copy, asset refs). The
`status` reuses the shared `campaign_status` enum — an ad inherits the same lifecycle
vocabulary as its parent campaign. Ad delivery targeting is **consent-gated** via the
parent campaign and the ad [`audience`](audience.md) (ADR-0026); the `ad` row itself holds
the creative, not the recipient set.

The Meta paid hierarchy is `act_<adAccountId>` / campaign / **adset** / ad. The `ad` row
carries the **ad** id in `external_ref` and the **adset** id in `adset_external_ref` (migration
0210, ADR-0124 #6); the ad-account id is a `conn-company-meta` credential-blob value (BE #426),
**not** a row column, and the campaign id rides the parent `campaign.external_ref`.
`daily_budget` is the ad-level paid budget (the campaign-level lifetime `budget` already lives
on `campaign`). A published [`social_post`](social_post.md) can be **Boosted** into an ad
reusing that post as creative — recorded by `boosted_from_social_post_id` (the Boost bridge,
ADR-0124 #6).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `campaign_id` | uuid | FK → `campaign` (the parent campaign) |
| `name` | text | ad label |
| `creative` | jsonb | creative payload — copy, asset references |
| `status` | enum `campaign_status` | `draft` · `active` · `paused` · `completed` (shared with `campaign`) |
| `external_ref` | text | platform **ad**-object id (nullable until published) |
| `adset_external_ref` | text | platform **adset** id — the missing middle of the Meta hierarchy (0210); nullable |
| `daily_budget` | numeric | ad-level paid budget (campaign-level lifetime `budget` lives on `campaign`); nullable |
| `audience_id` | uuid | FK → `audience` (`ON DELETE SET NULL`) — the paid-media targeting set (consent-gated); nullable |
| `boosted_from_social_post_id` | uuid | FK → `social_post` (`ON DELETE SET NULL`) — the Boost bridge: a published post reused as ad creative; nullable |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `campaign_id` → [`campaign`](campaign.md): the parent campaign; an ad's platform and
  budget context come from there.
- `audience_id` → [`audience`](audience.md): the paid-media targeting set (consent-gated,
  ADR-0026).
- `boosted_from_social_post_id` → [`social_post`](social_post.md): the organic post boosted
  into this ad (the Boost bridge, ADR-0124 #6); NULL for pure paid creative.
- Children / consumers: [`campaign_metric`](campaign_metric.md) (`ad_id` → here) attributes
  time-series metrics to this creative.

## Notes

Creative copy and budgets are commercially sensitive but carry no client PII — keep specific
values out of this doc; resolve against the live read-only DB (CLAUDE.md §8). No secrets.
