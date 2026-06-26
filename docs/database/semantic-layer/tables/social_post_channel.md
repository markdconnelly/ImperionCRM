---
type: Silver Table
title: social_post_channel
entity: social_post_channel
archetype: B
description: The per-network fan-out result of a social_post (ADR-0124 #3) — one row per (social_post, channel), carrying the network-adapted payload, publish status, the platform post id, and last error.
resource: ../../../decision-records/ADR-0124-social-media-management-plane.md
tags: [silver, marketing, social, social_post_channel, demand-gen]
data_class: operational
timestamp: 2026-06-26T00:00:00Z
---

# social_post_channel

The **per-network outcome** of a [`social_post`](social_post.md) fan-out: one row per
(post, channel). Where `social_post` is the compose-once parent, this child is the realized
publication on **one Social Channel** — the network-adapted payload, the publish status, the
platform's post id once live, and the last failure. Governed by
[ADR-0124](../../../decision-records/ADR-0124-social-media-management-plane.md) (decision 3).
Born silver — website system of record for the intent/state; the platform's `external_id` is
written back on publish.

## Source of record / authority

**Website system of record** for the per-channel intent and lifecycle state; the platform is
the source of the `external_id` (its post id) once the publish executes. The grain is the
**UNIQUE `(social_post_id, channel)`** — exactly one fan-out row per network per post.
`adapted_payload` is the composition adapted to that network's constraints. `publish_status`
adds `failed` over the parent's intent enum (the parent has no per-network failure notion);
`error` carries the last publish failure when `publish_status='failed'`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `social_post_id` | uuid | FK → `social_post` (`ON DELETE CASCADE`) — the parent composition |
| `channel` | enum `social_channel` | `facebook` · `instagram` · `threads` · `linkedin` · `messenger` |
| `adapted_payload` | jsonb | the composition adapted to this network's constraints |
| `publish_status` | enum `social_publish_status` | `draft` · `scheduled` · `published` · `failed` (default `draft`) |
| `external_id` | text | platform post id once live; nullable until published |
| `published_at` | timestamptz | when the platform accepted the post; nullable |
| `error` | text | last publish failure (set with `publish_status='failed'`); nullable |
| `created_at` / `updated_at` | timestamptz | |

UNIQUE `(social_post_id, channel)` — one fan-out row per network.

## Joins

- `social_post_id` → [`social_post`](social_post.md) (the parent; cascade delete).
- "Connected" channels are **derived from [`connection`](connection.md) rows**
  (`conn-company-meta` / `-threads` / `-linkedin`), **not** a channel-registry table
  (ADR-0124 #3) — the `channel` enum value is the only network identifier here.
- Reverse: [`social_engagement`](social_engagement.md) `on_social_post_channel_id` → here
  (a comment on this specific published post).
- Metrics for the published post flow to [`social_metric`](social_metric.md) (organic), keyed
  by the platform `external_id` (polymorphic pointer, no hard FK).

## Notes

No client PII — this is our own outbound publication record. Keep specific payloads out of
this doc; resolve against the live read-only DB (CLAUDE.md §8). No secrets — the publishing
credential is the `conn-company-*` Key Vault secret, never stored on the row.
