---
type: Silver Table
title: conversation_segment
entity: conversation_segment
archetype: B
description: One diarized turn of a captured conversation — the embedding unit of the conversational-intelligence pipeline and the citation target for voice recall.
resource: ../../../decision-records/ADR-0068-conversational-intelligence-pipeline.md
tags: [silver, communications, conversation_segment, voice, embedding]
data_class: client_pii
timestamp: 2026-06-22T00:00:00Z
---

# conversation_segment

One **diarized turn** of a captured [`conversation`](conversation.md) — a speaker-labelled
slice of the transcript with its time offsets. It is the **embedding unit** of the
conversational-intelligence pipeline (ADR-0041 / ADR-0068): the diarized turn (not the
whole call) is what gets chunked and embedded into the gold corpus, and what a vector hit
resolves back to for an attributable citation. Child of `conversation` (the header);
governed by
[ADR-0068](../../../decision-records/ADR-0068-conversational-intelligence-pipeline.md).

## Source of record / authority

**App-native, single-SoR; derived from the transcript, not a polled source.** The backend
conversational-intelligence pipeline produces segments from Azure Speech diarized output
during the `transcribed` stage of the parent conversation (ADR-0068); the front end only
reads them. There is no bronze-per-source table — a conversation is a derived artifact, so
its segments are authoritative as produced. Segments live and die with the parent: the
backend purge job removes them on/after the conversation's `retention_expires_at` (ADR-0068
decision 5), so absence of segments on a `purged` conversation is correct, not data loss.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `conversation_id` | uuid | FK → `conversation` (ON DELETE CASCADE) — the owning call/meeting |
| `speaker` | text | diarized speaker label (nullable until diarization resolves) — **may identify a client** |
| `start_ms` | integer | offset into the recording (turn start) |
| `end_ms` | integer | offset into the recording (turn end) |
| `text` | text | the turn's transcript — **sensitive client content**; this is the field embedded by LP (Voyage `voyage-3-large` @1024, ADR-0041) |
| `created_at` | timestamptz | |

## Joins

- `conversation_id` → [`conversation`](conversation.md) (CASCADE); the header carries the
  account/contact/opportunity links, consent basis, and retention window.
- **Downstream (gold):** `text` is composed into a gold `knowledge_object`
  (`entity_type='conversation_segment'`) and embedded by `_LocalPipelineEnrichment`
  (ADR-0041); a vector hit resolves to its source turn via the
  `conversation_segment_citation` view — recall the orchestrator can **cite** (ADR-0068),
  not invent.
- Sibling: [`conversation_insight`](conversation_insight.md) (the AI findings over the
  same conversation).

## Notes

`speaker` and `text` are **sensitive client conversation content** and client-identifying.
PII-free here by design; resolve specifics against the live read-only DB (CLAUDE.md §8).
Embedding egress is the pinned-provider path (ADR-0041); segments are embedded from the
on-prem node, and purged with the parent on retention expiry.
