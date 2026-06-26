---
type: Silver Table
title: social_metric
entity: social_metric
archetype: B
description: A normalized social-platform metric value (reach, impressions, followers, …) for a platform entity at a point in time, fed from meta_insights. Platform is authoritative; BI/reporting consumes it.
resource: ../../../decision-records/ADR-0062-reporting-bi-hub.md
tags: [silver, marketing, social, metric, bi, reporting, demand-gen]
data_class: operational
timestamp: 2026-06-25T00:00:00Z
---

# social_metric

A normalized **social-platform metric**: one named measure (reach, impressions, followers,
engagement, …) for a specific platform entity (a page, a post, an account) at a point in
time. It is the long, thin, generic shape the BI/reporting hub charts social performance
from, normalized out of the raw `meta_insights` bronze feed. Born silver — a per-source
projection; the **platform is authoritative** for the numbers. Governed by
[ADR-0062](../../../decision-records/ADR-0062-reporting-bi-hub.md) (BI hub).

## Source of record / authority

**Ad/social platform is authoritative for the values**; the row is the app's normalized
mirror fed from the `meta_insights` bronze feed. The grain is the **UNIQUE
`(platform, entity_kind, entity_external_id, metric, period, captured_at)`** — one value per
metric per entity per period per capture time, so re-ingesting the same point is idempotent
(UPSERT, no duplicate accumulation). `entity_kind` + `entity_external_id` are a **generic
polymorphic pointer** to the platform object (the metric layer is metric-name-driven and is
deliberately decoupled from any one entity table). `metric` is the measure name and `period`
its window (e.g. lifetime vs day); both are free text so new platform metrics ride in
without a migration.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `platform` | text | source platform (e.g. facebook, instagram) |
| `entity_kind` | text | the kind of platform object measured (page / post / account / …) — polymorphic pointer |
| `entity_external_id` | text | the platform object's external id — polymorphic pointer |
| `metric` | text | the measure name (reach, impressions, followers, …) |
| `period` | text | the metric window (lifetime, day, …); nullable |
| `value` | numeric | the metric value |
| `captured_at` | timestamptz | when this value was captured |
| `created_at` | timestamptz | when ingested |

UNIQUE `(platform, entity_kind, entity_external_id, metric, period, captured_at)` — one
value per metric/entity/period/capture; ingest is idempotent (UPSERT).

## Joins

- No hard FK — `entity_kind` + `entity_external_id` are a **generic external pointer** to
  the platform object, deliberately decoupled from any one silver table (the metric layer
  is metric-name-driven, not entity-FK-driven).
- Fed from the `meta_insights` bronze feed (`platform` ∈ facebook/instagram) and the
  `threads_insights` bronze feed (`platform='threads'`, NNNN / ADR-00NN Threads adapter);
  consumed by the BI / reporting hub
  ([`metric_definition`](metric_definition.md), ADR-0062) for social dashboards.

## Notes

Aggregate social performance numbers — no client PII (the measured entities are our own
public social presence, addressed by external id). Metric names have been unstable
historically (#135); resolve specific values and the live metric vocabulary against the
read-only DB (CLAUDE.md §8). No secrets.
