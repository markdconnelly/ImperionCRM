---
type: Silver Table
title: campaign
description: Marketing campaign across platforms — website system of record; parents ads, metrics, and lead attribution.
resource: ../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md
tags: [silver, marketing, campaign, demand-gen]
timestamp: 2026-06-14T00:00:00Z
---

# campaign

A demand-generation campaign on a given platform. Born silver — website system of record
(definition); platform APIs feed metrics. Governed by
[ADR-0053](../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md)
and [ADR-0026](../../../decision-records/ADR-0026-demand-gen-audiences-and-ad-consent.md)
(ad consent).

## Source of record / authority

**Website system of record** for the campaign definition; `external_ref` links the
platform object. `platform` is an enum (facebook / google / youtube / linkedin / email /
sms). Ad targeting is **consent-gated** — `current_consent` governs who may be targeted
(ADR-0026).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | |
| `platform` | enum | channel |
| `objective` | text | |
| `status` | enum | lifecycle |
| `budget` | numeric | |
| `start_at` / `end_at` | date | |
| `external_ref` | text | platform object id |
| `event_id` / `workflow_id` | uuid | FK → `event` / `workflow` |
| `created_by_user_id` | uuid | FK → `app_user` |

## Joins

- Children: `ad`, `campaign_metric` (time-series spend/impressions/clicks/leads).
- `event_id` → `event`; `workflow_id` → `workflow`; attribution: `contact.campaign_id`.

## Notes

Campaign config is mostly internal, but budgets and targeting are commercially sensitive —
keep specific values out of this doc; resolve against the live read-only DB.
