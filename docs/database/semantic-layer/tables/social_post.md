---
type: Silver Table
title: social_post
entity: social_post
archetype: B
description: A compose-once organic social composition (ADR-0124 #3) — authored once, fanned out to one or more Social Channels via social_post_channel. Website system of record; optional link to a marketing campaign.
resource: ../../../decision-records/ADR-0124-social-media-management-plane.md
tags: [silver, marketing, social, social_post, demand-gen]
data_class: operational
timestamp: 2026-06-26T00:00:00Z
---

# social_post

A single **organic social composition**: content authored *once* and published to one or
more Social Channels (Facebook / Instagram / Threads / LinkedIn / Messenger). The
compose-once → fan-out parent of [`social_post_channel`](social_post_channel.md), governed
by [ADR-0124](../../../decision-records/ADR-0124-social-media-management-plane.md) (decision 3).
Born silver — website system of record. Deliberately **not** a
[`campaign_send`](campaign_send.md): a campaign_send is recipient-targeted + per-recipient
consent-gated (email / SMS), whereas a social post is a public broadcast with neither.

## Source of record / authority

**Website system of record** for the composition. `content` is the authored payload (copy +
asset references) before per-network adaptation. `status` is the composition's lifecycle
**intent** (`draft` → `scheduled` → `published` → `archived`) — the realized outcome per
network lives on the child `social_post_channel.publish_status`. An optional `campaign_id`
links the post to a marketing [`campaign`](campaign.md) for attribution; the post is not a
campaign child (no campaign FK cascade — `ON DELETE SET NULL`).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `content` | jsonb | authored composition — copy + asset references (pre-adaptation) |
| `campaign_id` | uuid | FK → `campaign` (`ON DELETE SET NULL`) — optional marketing link |
| `created_by_user_id` | uuid | FK → `app_user` (`ON DELETE SET NULL`) — the author |
| `status` | enum `social_post_status` | `draft` · `scheduled` · `published` · `archived` (default `draft`) — composition intent |
| `scheduled_at` | timestamptz | publish-at when scheduled; nullable |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- Children: [`social_post_channel`](social_post_channel.md) (`social_post_id` → here) — one
  row per network the post fans out to.
- `campaign_id` → [`campaign`](campaign.md) (optional attribution link).
- `created_by_user_id` → `app_user`.
- Reverse: an [`ad`](ad.md) may carry `boosted_from_social_post_id` → here (the Boost bridge —
  a published post reused as paid creative, ADR-0124 #6).

## Notes

Composition content is internal marketing copy — no client PII (the audience is our own
public social presence). Keep specific copy/assets out of this doc; resolve against the live
read-only DB (CLAUDE.md §8). Outbound publishing is governed: every publish is a Social
Action through the gauntlet + pending-action cockpit (`agent_pending_action`, ADR-0124 #4),
v1 fully human-approved. No secrets.
