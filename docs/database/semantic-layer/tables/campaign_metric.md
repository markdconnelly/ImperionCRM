---
type: Silver Table
title: campaign_metric
entity: campaign_metric
archetype: B
description: A daily performance row (spend/impressions/clicks/leads) for a campaign or one of its ads, pulled from the ad platform. Platform is the authority for the numbers; one row per metric_date.
resource: ../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md
tags: [silver, marketing, campaign, metric, demand-gen, bi]
data_class: operational
timestamp: 2026-06-23T00:00:00Z
---

# campaign_metric

A daily performance snapshot for a [`campaign`](campaign.md) (or one of its
[`ad`](ad.md) creatives): spend, impressions, clicks, and attributed leads for a single
`metric_date`. It is the time-series the BI/reporting hub charts campaign performance from.
Born silver — a normalized projection of the ad platform's reporting; the **platform is the
authority** for the numbers. Governed by
[ADR-0053](../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md)
(and surfaced via the BI hub, ADR-0062).

## Source of record / authority

**Ad platform is authoritative for the metric values**; the row is the app's normalized
mirror keyed by `metric_date`. A metric attributes to either the whole campaign
(`campaign_id` set) or a specific creative (`ad_id` set) — both FKs are nullable so the
grain can be campaign-level or ad-level. `raw` preserves the platform's original metric
payload (the lossless input behind the normalized numeric columns). Re-pulling a day's
metrics replaces that day's values rather than accumulating — the numbers are a restated
snapshot per date, not an append-only ledger.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `campaign_id` | uuid | FK → `campaign` (campaign-level grain; nullable) |
| `ad_id` | uuid | FK → `ad` (ad-level grain; nullable) |
| `metric_date` | date | the day these numbers cover |
| `spend` | numeric | platform spend for the day |
| `impressions` | integer | |
| `clicks` | integer | |
| `leads` | integer | attributed leads for the day |
| `raw` | jsonb | the platform's original metric payload (lossless) |
| `created_at` | timestamptz | when ingested |

## Joins

- `campaign_id` → [`campaign`](campaign.md): the campaign these metrics roll up to.
- `ad_id` → [`ad`](ad.md): the specific creative, when the grain is ad-level.
- Consumed by the BI / reporting hub ([`metric_definition`](metric_definition.md), ADR-0062)
  for campaign-performance dashboards.

## Notes

Spend and performance figures are commercially sensitive but carry no client PII — keep
specific values out of this doc; resolve against the live read-only DB (CLAUDE.md §8).
