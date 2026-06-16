---
type: Silver Table
title: interaction
description: Unified multi-channel timeline event — one row per email/message/call/meeting/social, carrying bronze+silver+gold in one record.
resource: ../../../decision-records/ADR-0011-unified-interaction-timeline.md
tags: [silver, engagement, interaction, timeline]
timestamp: 2026-06-15T00:00:00Z
---

# interaction

The unified engagement timeline: one row per event across every channel (email, Teams,
calls, meetings, SMS, Facebook, Instagram, notes). Governed by
[ADR-0011](../../../decision-records/ADR-0011-unified-interaction-timeline.md).

## Source of record / authority

A single row carries all three medallion tiers in place: `payload_bronze` (lossless
source), `normalized_silver` (cleaned), `summary_gold` (inline AI summary). Authority is
**per-`source` / per-`kind`** — each channel's connector owns its rows, and the
`(source, external_ref)` pair is the dedup key the ingest path upserts on (idempotency by
contract; not a DB-level unique constraint). **B (+ gold):** the inline `summary_gold` is
the gold text on the row, while the retrieval **vector** lives out-of-row in
`knowledge_object` / `knowledge_embedding` (on-prem produced, Voyage `voyage-3-large` @
1024d), so the timeline row is never blocked on vectorization.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` / `contact_id` / `opportunity_id` | uuid | subjects (nullable); `account_id` CASCADE, `contact_id` / `opportunity_id` SET NULL |
| `source` | enum `interaction_source` | `m365_email` · `m365_teams` · `plaud` · `sms` · `email` · `facebook` · `system` (0001) · `youtube` · `linkedin` · `whatsapp` · `phone_call` · `in_person` · `meeting` · `web_form` (0018) · `instagram` (0075) |
| `channel` | text | free-form sub-channel label |
| `kind` | text | comm shape: `email` · `message` · `call` · `meeting` · `transcript` · `summary` · `social_post` · `social_comment` · `dm` · `ad_engagement` · `note` |
| `direction` | enum `interaction_direction` | `inbound` · `outbound` · `internal` |
| `subject` | text | |
| `payload_bronze` | jsonb | lossless source |
| `normalized_silver` | jsonb | cleaned |
| `summary_gold` | text | inline AI summary |
| `blob_ref` | text | pointer to object storage (audio / attachments) |
| `source_connection_id` | uuid | FK → `connection` (SET NULL) — the employee connection that produced it |
| `owner_user_id` | uuid | FK → `app_user` (SET NULL) — related first to the employee, then the company |
| `project_id` | uuid | FK → `project` (SET NULL); set on meeting interactions (ADR-0052 §5), NULL on sales meetings |
| `external_ref` | text | per-source id; `(source, external_ref)` is the upsert dedup key |
| `occurred_at` | timestamptz | timeline position |

## Joins

- `account_id` → `account`; `contact_id` → `contact`; `source_connection_id` →
  `connection`; `project_id` → `project` (SET NULL).
- `meeting` is a 1:1 structured extension where `kind = 'meeting'`.
- Downstream: `meeting_action_item` (follow-ups extracted from a meeting interaction).

## Notes

Interaction payloads contain message bodies and personal data — among the most sensitive
rows in the system. Never inline content; resolve against the live read-only DB.
