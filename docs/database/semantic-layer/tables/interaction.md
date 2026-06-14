---
type: Silver Table
title: interaction
description: Unified multi-channel timeline event — one row per email/message/call/meeting/social, carrying bronze+silver+gold in one record.
resource: ../../../decision-records/ADR-0011-unified-interaction-timeline.md
tags: [silver, engagement, interaction, timeline]
timestamp: 2026-06-14T00:00:00Z
---

# interaction

The unified engagement timeline: one row per event across every channel (email, Teams,
calls, meetings, SMS, Facebook, Instagram, notes). Governed by
[ADR-0011](../../../decision-records/ADR-0011-unified-interaction-timeline.md).

## Source of record / authority

A single row carries all three medallion tiers in place: `payload_bronze` (lossless
source), `normalized_silver` (cleaned), `summary_gold` (AI summary). Authority is
**per-`source` / per-`kind`** — each channel's connector owns its rows, deduped by
`(source, external_ref)`. The gold vector for retrieval lives in `knowledge_object` /
`knowledge_embedding` (on-prem produced), not inline.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` / `contact_id` / `opportunity_id` | uuid | subjects (nullable) |
| `source` | enum | channel/source system |
| `channel` / `kind` | text | e.g. email / chat / call / meeting / post |
| `direction` | enum | inbound / outbound |
| `subject` | text | |
| `payload_bronze` | jsonb | lossless source |
| `normalized_silver` | jsonb | cleaned |
| `summary_gold` | text | AI summary |
| `source_connection_id` | uuid | FK → `connection` |
| `owner_user_id` | uuid | FK → `app_user` |
| `external_ref` | text | dedup key with `source` |
| `occurred_at` | timestamptz | timeline position |

## Joins

- `account_id` → `account`; `contact_id` → `contact`; `source_connection_id` →
  `connection`; `project_id` → `project` (SET NULL).
- `meeting` is a 1:1 structured extension where `kind = 'meeting'`.

## Notes

Interaction payloads contain message bodies and personal data — among the most sensitive
rows in the system. Never inline content; resolve against the live read-only DB.
