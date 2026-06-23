---
type: Silver Table
title: campaign_send
entity: campaign_send
archetype: B
description: A scheduled or event-triggered email/SMS blast for a campaign, to a recipient scope or audience, with per-send delivery counters. Website system of record; consent-gated.
resource: ../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md
tags: [silver, marketing, campaign, send, email, sms, demand-gen]
data_class: operational
timestamp: 2026-06-23T00:00:00Z
---

# campaign_send

A single outbound blast for a [`campaign`](campaign.md): one scheduled (or
event-offset-triggered) email/SMS send to a recipient scope or an
[`audience`](audience.md), with its own template and per-send delivery counters. It is the
operational record of "we sent this campaign message at this time to these people" and the
roll-up of how delivery went. Born silver — website system of record. Governed by
[ADR-0053](../../../decision-records/ADR-0053-campaign-builders-events-scheduled-sends.md)
(scheduled & event-triggered sends).

## Source of record / authority

**Website system of record.** A send belongs to one campaign (`campaign_id`) on a `channel`
(email/sms). `recipient_scope` declares who it targets (e.g. an audience vs a broader set);
when an audience, `audience_id` points at it. `template` is the message payload (jsonb).
Scheduling is **either** absolute (`send_at`) **or** relative to an event
(`event_offset_minutes`, e.g. "60 minutes before the webinar"). `status` is the send
lifecycle; the four counters (`queued`/`sent`/`delivered`/`failed`) are the authoritative
per-send delivery roll-up, updated as the backend send process runs. Every send is
**consent-gated** — `current_consent` governs who may be contacted (ADR-0026); the send
never bypasses it.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `campaign_id` | uuid | FK → `campaign` (the parent campaign) |
| `channel` | text | `email` \| `sms` — the send channel |
| `recipient_scope` | text | who the send targets (scope descriptor) |
| `audience_id` | uuid | FK → `audience` — the targeted set (nullable; used when scope is an audience) |
| `template` | jsonb | the message payload (subject/body/merge fields) |
| `send_at` | timestamptz | absolute scheduled time (nullable if event-relative) |
| `event_offset_minutes` | integer | relative offset to a linked event (nullable if absolute) |
| `status` | enum `campaign_send_status` | `draft` · `scheduled` · `sending` · `sent` · `canceled` |
| `queued_count` | integer | recipients queued |
| `sent_count` | integer | recipients sent |
| `delivered_count` | integer | confirmed delivered |
| `failed_count` | integer | delivery failures |
| `sent_at` | timestamptz | when the send actually went out (nullable) |
| `created_by_user_id` | uuid | FK → `app_user` |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `campaign_id` → [`campaign`](campaign.md): the parent campaign.
- `audience_id` → [`audience`](audience.md): the targeted recipient set, when scope is an
  audience.
- `created_by_user_id` → [`app_user`](app_user.md): who scheduled the send.
- Gated by `current_consent` (ADR-0026): the backend send process filters recipients by
  consent before dispatch.

## Notes

Recipient scope and delivery counts are operational; the actual recipient list is not stored
here (it resolves to consent-gated contacts at send time). Template copy is internal
marketing content — keep specifics out of this doc; resolve against the live read-only DB
(CLAUDE.md §8). No secrets.
