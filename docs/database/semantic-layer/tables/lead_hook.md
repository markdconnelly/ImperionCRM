---
type: Silver Table
title: lead_hook
entity: lead_hook
archetype: B
description: A configured lead-capture endpoint (web form, Facebook lead, QR, inbound email, …) that receives raw inbound hits as lead_capture_event rows. Website system of record.
resource: ../../../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md
tags: [silver, marketing, lead, hook, capture, demand-gen, lead-response]
data_class: client_pii
timestamp: 2026-06-25T00:00:00Z
---

# lead_hook

A configured **lead-capture endpoint**: a named, typed source through which inbound leads
arrive (a web form, a Facebook lead form, a QR code, an inbound email, …). Each hit on a
hook lands as a raw [`lead_capture_event`](lead_capture_event.md). The hook is the
*definition* (where leads come in and how that channel is configured); the capture events
are the *traffic*. Born silver — website system of record. Governed by
[ADR-0024](../../../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md).

## Source of record / authority

**Website system of record.** `kind` types the channel. `config` (jsonb) holds the
channel-specific setup (form field map, page binding, external source ids) — channel
configuration, **not** a secret store (any token a channel needs is held by reference in
the connection / Key Vault layer, never inlined here, per ADR-0103). `active` gates whether
the hook accepts hits. A hook of kind `event_registration` is the capture surface behind an
[`event`](event.md)'s registration page.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | hook label |
| `kind` | enum `lead_hook_kind` | `web_form` · `facebook_lead` · `youtube_comment` · `linkedin_message` · `inbound_email` · `qr` · `manual` · `event_registration` · `facebook_dm` · `instagram_dm` (0206, the IG twin of `facebook_dm` — inbound IG DM senders, LocalPipeline #361) |
| `config` | jsonb | channel-specific configuration (field map, bindings, external ids) — not secrets |
| `active` | bool | whether the hook accepts hits |
| `created_by_user_id` | uuid | FK → `app_user` |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- Children: [`lead_capture_event`](lead_capture_event.md) (`hook_id` → here) — the raw
  inbound hits on this hook.
- `created_by_user_id` → [`app_user`](app_user.md): who configured the hook.
- A `kind='event_registration'` hook is the capture surface for an [`event`](event.md)
  registration page.

## Notes

A hook is configuration — no client PII of its own (the captured leads live on
[`lead_capture_event`](lead_capture_event.md)). `config` is channel setup, **never**
secrets — tokens stay in Key Vault by reference (ADR-0103). Resolve channel specifics
against the live read-only DB (CLAUDE.md §8).
