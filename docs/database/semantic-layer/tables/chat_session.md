---
type: Silver Table
title: chat_session
entity: chat_session
archetype: B
description: An Imperion-native pre-ticket live-chat / bot session plus deflection telemetry — the only service-desk data Imperion stores natively (everything ticket-resident round-trips through Autotask). Website system of record (backend chat process).
resource: ../../../decision-records/ADR-0074-service-desk-depth.md
tags: [silver, service-desk, chat, deflection, native]
timestamp: 2026-06-15T23:55:00Z
---

# chat_session

An Imperion-**native** pre-ticket live-chat / bot session (ADR-0074 §5, #403): a
conversation that is **not ticket-resident** and so has nowhere to round-trip to.
Autotask is the ticket system of record (ADR-0044) — anything that belongs *on a
ticket* (resolution notes, CSAT, SLA annotations) is written back to Autotask via its
API and read back natively through the existing pull. `chat_session` is the deliberate
exception: a conversation Autotask never sees, plus the **deflection telemetry** that
makes the chatbot-deflection rate measurable. Migration `0117`.

Born silver — the app **is** the source of truth (archetype B). A gold-grounded bot
(ADR-0041) answers first; the session either **deflects** (resolved, no ticket),
**escalates** (creates an Autotask ticket, handing over the transcript), or is closed.

Deliberately NOT modeled here (ADR-0074): no `sla_state` source-of-record (SLA breach is
a read-model projection over silver [`ticket`](ticket.md), refreshed by the pipeline) and
no standalone CSAT store (CSAT writes back to the Autotask ticket and round-trips into
bronze→silver).

## Source of record / authority

**Website system of record, written by a process.** The **backend** chat / chatbot
process (ADR-0042 / ADR-0074 §7 — a *process*, not the front end) creates and updates the
session and stamps the deflection outcome; the pipeline may touch it on refresh; the
front end **reads** it (`listChatSessions` / `listChatSessionsForContact`, with a
pure deflection roll-up in `lib/chat-session.ts`). The chat-console surface itself is a
later slice (#407 / #404).

The `escalated_ticket_ref` is an **Autotask** ticket id held as text — Autotask owns the
id, and silver `ticket` may not have pulled the new ticket yet (a read-after-write lag,
ADR-0074), so there is no FK into `ticket`.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid \| null | FK → `account` (ON DELETE SET NULL — pre-ticket sessions are often anonymous) |
| `contact_id` | uuid \| null | FK → `contact` (ON DELETE SET NULL) |
| `status` | text | `bot` \| `live` \| `deflected` \| `escalated` \| `closed`; CHECK; default `bot` |
| `channel` | text | `web_chat` \| `social` \| `email` \| `sms` \| `voice` \| `other`; CHECK |
| `deflected` | boolean | resolved WITHOUT a ticket — the deflection-rate numerator |
| `deflection_kind` | text \| null | `self_served` \| `bot_resolved`; CHECK; NULL when not deflected |
| `escalated_ticket_ref` | text \| null | Autotask ticket id once escalated (no FK — Autotask owns it) |
| `had_ticket` | boolean | derived flag for the BI-hub deflection split |
| `transcript_uri` | text \| null | pointer to the governed-blob transcript (not inlined) |
| `summary` | text \| null | optional short summary for the timeline / routing card |
| `started_at` | timestamptz | session open |
| `closed_at` | timestamptz \| null | session end |
| `created_at` | timestamptz | row insert |

CHECK `NOT (deflected AND escalated_ticket_ref IS NOT NULL)` — a session is deflected XOR
escalated, never both.

## Joins

- `account_id` → [`account`](account.md), `contact_id` → [`contact`](contact.md): the
  party on the conversation, when known (both nullable — anonymous pre-ticket sessions).
- `escalated_ticket_ref` → the Autotask ticket (by id, not FK) the session became — the
  bridge from a native conversation to the Autotask-resident [`ticket`](ticket.md).
- Deflection telemetry rolls up to the chatbot-deflection rate on the BI hub (ADR-0062):
  `COUNT(deflected) / COUNT(*)` over a window.

## Notes

The conversation **transcript is held by reference** (`transcript_uri`) in governed blob,
never inlined in a row — it may carry client PII. No personal data lives in this concept
file (ADR-0086 constraint 2); specific session values resolve against the live read-only
DB. Bounded, append-mostly growth (one row per conversation).
