---
type: Silver Table
title: social_metric
entity: social_metric
archetype: B
description: A normalized social-platform metric value (reach, impressions, followers, …) for a platform entity at a point in time, fed from meta_insights. Platform is authoritative; BI/reporting consumes it.
resource: ../../../decision-records/ADR-0062-reporting-bi-hub.md
tags: [silver, marketing, social, metric, bi, reporting, demand-gen]
data_class: operational
timestamp: 2026-06-26T18:00:00Z
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

Under the unified Social plane (ADR-0124), this stays the **organic** metric home for every
Social Channel — `campaign_metric` remains paid-only (ADR-0012). `entity_kind` is the
metric-name-driven polymorphic pointer and is **free text**, so it widens *by vocabulary, not
migration* to cover Threads and LinkedIn post entities (e.g. `threads_post`, `linkedin_post`)
alongside the existing `page` / `post` / `media` / `account` values as those adapters land
(Threads ADR-0125; LinkedIn #1007). A published [`social_post_channel`](social_post_channel.md)
is the organic object these metrics attribute to, keyed by its platform `external_id`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `platform` | text | source platform (e.g. facebook, instagram) |
| `entity_kind` | text | the kind of platform object measured (page / post / media / account / `threads_post` / `linkedin_post` / …) — free-text polymorphic pointer; new kinds ride in without a migration |
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
  `threads_insights` bronze feed (`platform='threads'`, 0208 / ADR-0125 Threads adapter);
  consumed by the BI / reporting hub
  ([`metric_definition`](metric_definition.md), ADR-0062) for social dashboards.

## Canonical metric vocabulary

Raw Meta insight metric names are **normalized to a canonical vocabulary at silver** during the
on-prem merge (slice H, LP #357 — the canon map lives in LP `Get-ImperionSocialMetricCanonSql`),
which is what finally stabilizes the long-standing metric-name instability (#135) **at the data
layer** rather than per-dashboard. The authority for the *naming* is therefore this canonical
vocabulary (silver), while the platform stays authoritative for the *values*; BI/reporting
(`metric_definition`, ADR-0062) charts against the canonical names, so a new platform-side
metric is mapped once at merge instead of forking every dashboard. The names remain free text
(no enum), so the vocabulary extends without a migration.

## Notes

Aggregate social performance numbers — no client PII (the measured entities are our own
public social presence, addressed by external id). The canonical-vocabulary note above resolves
the historic metric-name instability (#135) at silver; resolve specific values and the live
canonical metric vocabulary against the read-only DB (CLAUDE.md §8). No secrets.
