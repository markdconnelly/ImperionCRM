---
type: Silver Table
title: meeting
entity: meeting
archetype: B
description: Structured meeting object (Teams Copilot recap / Plaud summary) 1:1 with an interaction of kind 'meeting'; the drill-down behind a meeting in the timeline.
resource: ../../../decision-records/ADR-0011-unified-interaction-timeline.md
tags: [silver, communications, meeting, teams, plaud]
data_class: client_pii
timestamp: 2026-06-22T00:00:00Z
---

# meeting

The structured drill-down behind a meeting that appears in the unified communications
timeline — a Teams meeting (Copilot recap + transcript) or a Plaud in-person recap. It is
**1:1 with an `interaction` of kind `meeting`**, so it inherits that interaction's links to
the contact and account. Email-from-365 stays modeled as a plain interaction. Governed by
[ADR-0011](../../../decision-records/ADR-0011-unified-interaction-timeline.md).

## Source of record / authority

**Per-platform source, anchored to the interaction.** The owning `interaction` is the
timeline system of record; `meeting` carries the platform-specific narrative
(`copilot_recap` for Teams, `plaud_summary` for Plaud) plus the bronze→silver→gold ladder
(`payload_bronze` raw export → `normalized_silver` → `summary_gold` agent-ready summary).
The full transcript lives in object storage, referenced by `transcript_ref` (not inlined).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `interaction_id` | uuid | FK → `interaction`, **unique** (1:1) |
| `platform` | enum | `teams` · `plaud` · `other` |
| `title` | text | |
| `copilot_recap` | text | Teams Copilot recap (silver/gold narrative) |
| `plaud_summary` | text | Plaud meeting summary |
| `transcript_ref` | text | pointer to full transcript blob (object storage) |
| `payload_bronze` | jsonb | raw source payload (Graph / Plaud export) |
| `normalized_silver` | jsonb | cleaned/normalized |
| `summary_gold` | text | agent-ready summary |
| `occurred_at` | timestamptz | when the meeting happened |

## Joins

- `interaction_id` → `interaction` (1:1); through it, → `contact` and `account`.
- Downstream: `meeting_action_item` (extracted follow-ups).

## Notes

Recaps, summaries, and transcripts contain client conversation content — sensitive and
client-identifying. Keep specifics out of this doc; resolve against the live read-only DB.
