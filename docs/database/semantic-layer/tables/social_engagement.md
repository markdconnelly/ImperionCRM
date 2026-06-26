---
type: Silver Table
title: social_engagement
entity: social_engagement
archetype: B
description: Inbound public social engagements — comments on our posts + brand mentions (ADR-0124 #2 inbound split). Deliberately NOT on the Interaction timeline; contact-linked only on match. Idempotent poll-in merge.
resource: ../../../decision-records/ADR-0124-social-media-management-plane.md
tags: [silver, marketing, social, social_engagement, inbound]
data_class: operational
timestamp: 2026-06-26T00:00:00Z
---

# social_engagement

A single **inbound public social engagement** — a comment on one of our posts or a brand
mention of us — pulled in from a Social Channel. The ADR-0124 **inbound-split** store
(decision 2): private DMs join the [`interaction`](interaction.md) timeline (`kind=dm`) and
spawn lead_hooks, but **public** comments/mentions land *here* instead. Governed by
[ADR-0124](../../../decision-records/ADR-0124-social-media-management-plane.md). Born silver;
merged from the per-network poll (ADR-0026 cadence).

**Why not on the Interaction timeline?** The Interaction timeline is contact-centric and
feeds Contact-360; public comments/mentions are frequently from anonymous accounts not in the
contact graph, so routing them onto the timeline would pollute Contact-360 (ADR-0124 #2). A
future reader asking "why aren't comments Interactions?" — this is the answer.

## Source of record / authority

**Website system of record** for the triage state; the **platform is the source** of the
engagement content + author fields. The grain is the **UNIQUE `(channel, external_id)`** — one
row per platform comment/mention, so re-polling the same item is idempotent (UPSERT, no
duplicate accumulation). `contact_id` is populated **only on match** by the author→contact
matcher, which is **slice G** (not this slice). `on_social_post_channel_id` is set for comments
on our own posts; `source_url` carries a mention's origin. Triage (`status` / `intent` /
`assigned_agent_key`) records the routing decision (lead → Chase, support → Felix, brand →
Belle; ADR-0124 #5). v1 scope: comments on our **organic** posts + brand **mentions** only
(ad-comment ingestion deferred).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `channel` | enum `social_channel` | `facebook` · `instagram` · `threads` · `linkedin` · `messenger` |
| `external_id` | text | platform's stable id for the comment/mention |
| `kind` | enum `social_engagement_kind` | `comment` · `mention` |
| `body` | text | the comment/mention text — **third-party personal data** |
| `posted_at` | timestamptz | when the author posted it (platform time) |
| `ingested_at` | timestamptz | when we polled it in (default `now()`) |
| `author_external_id` | text | the platform's author id — **personal data** |
| `author_handle` | text | the author's @handle — **personal data** |
| `author_display_name` | text | the author's display name — **personal data** |
| `author_profile_url` | text | public profile link — **personal data** |
| `contact_id` | uuid | FK → `contact` (`ON DELETE SET NULL`) — set on match (slice G); nullable |
| `on_social_post_channel_id` | uuid | FK → `social_post_channel` (`ON DELETE SET NULL`) — comments on OUR posts; nullable |
| `source_url` | text | the mention's source page; nullable |
| `status` | enum `social_engagement_status` | `new` · `triaged` · `replied` · `dismissed` (default `new`) |
| `intent` | text | triage intent (lead / support / brand); nullable |
| `assigned_agent_key` | text | routed agent key (Chase / Felix / Belle); nullable |
| `created_at` / `updated_at` | timestamptz | |

UNIQUE `(channel, external_id)` — one row per platform engagement; poll-in is idempotent.

## Joins

- `contact_id` → [`contact`](contact.md): set **only on match** by the slice-G author matcher
  (the engagement exists before any contact link, by design).
- `on_social_post_channel_id` → [`social_post_channel`](social_post_channel.md): the published
  post a comment is on (NULL for brand mentions).
- Related: [`contact_social_identity`](contact_social_identity.md) — a platform author identity
  is the eventual bridge from `author_external_id`/`author_handle` to a `contact`.
- Reply outbound = a Social Action (`agent_pending_action`, ADR-0124 #4), human-approved in v1.

## Notes

**PII / lawful basis.** This table captures **third-party author personal data** (`body`,
`author_handle`, `author_display_name`, `author_profile_url`, `author_external_id`) — the
people who comment on or mention us, who are **not** our contacts until matched. This is
public data the author posted to a public channel; processing it for community-management and
support routing rests on **legitimate interest** under the Contact-360 lawful-basis regime
([ADR-0025](../../../decision-records/ADR-0025-contact-360-enrichment-and-lawful-basis.md)).
Having an engagement is **never** consent to contact: any outbound (a reply, or promoting the
author to a contact for outreach) re-asserts consent via the
[`consent_event`](consent_event.md) ledger, exactly as Contact-360 enrichment does.

**Consumed by.** The unified Social inbox (`/social`, slice B #1340) reads this table merged
with private DMs from the [`interaction`](interaction.md) timeline (`kind='dm'`) into one
newest-first view — the two halves of the ADR-0124 #2 inbound split, recombined for the
operator. Read-only render (web has SELECT); replying is a cockpit-gated Social Action.

The table stays `data_class=operational` (matching the demand-gen plane) deliberately — the author-PII
risk is governed by this lawful-basis note + the consent gate on any outbound, **not** by
over-classing the read-gate (ADR-0124 #6). No row-level personal data in this doc; resolve
specifics against the live read-only DB (CLAUDE.md §8). No secrets.
