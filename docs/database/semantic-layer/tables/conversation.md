---
type: Silver Table
title: conversation
entity: conversation
archetype: B
description: One captured voice/meeting conversation (ACS call, Teams meeting, or upload) with its diarized turns (conversation_segment) and AI insights (conversation_insight); the voice channel of the customer 360 / interaction timeline.
resource: ../../../decision-records/ADR-0068-conversational-intelligence-pipeline.md
tags: [silver, communications, conversation, voice, transcription, ai]
timestamp: 2026-06-15T00:00:00Z
---

# conversation

The voice/meeting counterpart to `interaction` on the customer 360: one **captured
conversation** — an ACS call, a Teams meeting, or a manually uploaded recording — that
is transcribed (Azure Speech, diarized), analyzed (Claude — ADR-0043), and whose
transcript turns are embedded for search (Voyage @1024 — ADR-0041). Governed by
[ADR-0068](../../../decision-records/ADR-0068-conversational-intelligence-pipeline.md).
Three tables form the unit: `conversation` (the header, one per call/meeting),
`conversation_segment` (diarized turns — the embedding unit), and
`conversation_insight` (AI outputs).

## Source of record / authority

**App is the system of record for the conversation record; the source supplies the
capture.** A conversation is a *derived artifact*, not a polled external source, so
there is no bronze-per-source table (ADR-0068 decision 3). `source` records where the
capture came from (`acs` · `teams` · `upload`); `external_ref` is that source's id
(ACS call id / Teams meeting id / upload id) and dedupes re-ingestion. The backend
orchestrates capture→transcribe→analyze and holds the credentials (ADR-0042); this
front end only **reads** for display. Raw audio and the full transcript are
**referenced blobs** (`audio_artifact_uri` / `transcript_artifact_uri`), not stored in
Postgres; only the diarized turns and the AI insights are relational.

## Schema

### conversation
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid? | FK → `account` (SET NULL) — an upload may be unlinked until auto-linking |
| `contact_id` | uuid? | FK → `contact` (SET NULL) |
| `opportunity_id` | uuid? | FK → `opportunity` (SET NULL) — the "deal" link |
| `source` | text | `acs` · `teams` · `upload` |
| `external_ref` | text? | source id; `(source, external_ref)` unique where present |
| `audio_artifact_uri` | text? | pointer to the audio blob (referenced, not stored) |
| `transcript_artifact_uri` | text? | pointer to the full transcript blob |
| `started_at` / `ended_at` | timestamptz? | call/meeting span |
| `duration_seconds` | int? | ≥ 0 |
| `consent_basis_id` | uuid? | FK → `consent_event` (ADR-0014); enforced by the backend before transcribe |
| `retention_expires_at` | timestamptz? | purge window end (ADR-0068 decision 5) |
| `status` | text | `captured` → `transcribed` → `analyzed` → `purged` |

### conversation_segment (diarized turn — the embedding unit)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `conversation_id` | uuid | FK → `conversation` (CASCADE) |
| `speaker` | text? | diarized label |
| `start_ms` / `end_ms` | int? | offsets into the recording |
| `text` | text | the turn; embedded in `_LocalPipelineEnrichment` (ADR-0041) |

### conversation_insight (AI output)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `conversation_id` | uuid | FK → `conversation` (CASCADE) |
| `kind` | text | `summary` · `action_item` · `sentiment` · `objection` · `risk` |
| `payload` | jsonb | kind-specific shape (grows without a migration) |
| `model` | text? | the Claude tier that produced it (ADR-0043) |

## Joins

- `account_id` → `account`; `contact_id` → `contact`; `opportunity_id` → `opportunity`
  (all optional — auto-linking an ambiguous capture is an ADR-0068 future consideration).
- `consent_basis_id` → `consent_event` (the consent ledger basis the transcription rests on).
- `conversation_segment.conversation_id` / `conversation_insight.conversation_id` →
  `conversation` (CASCADE).
- Downstream: segments embed into the gold knowledge corpus + citation view (ADR-0041);
  `risk`/`objection` insights feed forecasting (#316); a conversation summary lands on the
  unified interaction timeline (ADR-0011).

## Notes

**Consent + retention are first-class** (ADR-0068 decision 5): a conversation cannot be
transcribed without a `consent_basis_id` recorded in the ledger — enforced by the backend
orchestrator, not as a NOT NULL (capture can precede the check). On/after
`retention_expires_at` a backend purge job removes the transcript + segments and sets
`status = purged`; insights are optionally retained in aggregate.

Transcript text, segment text, and many insight payloads are **sensitive client
conversation content** and client-identifying. Keep specifics out of this doc; resolve
against the live read-only DB.
