# ADR-0068: Conversational intelligence — call/meeting transcription, AI analysis, and search

| Field | Value |
|---|---|
| **Repo** | frontend (schema + 360 surface); backend (orchestration + token custody); local-pipeline (vectorization) |
| **Status** | Proposed (2026-06-12, scope locked with Mark; source priority + persistence under review) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0041 (gold knowledge vector store / Voyage contract), ADR-0043 (settled AI stack), ADR-0014 (consent ledger), ADR-0018 (per-client M365 app), ADR-0011 (unified interaction timeline), ADR-0042 (division of labor) |
| **Epic** | #315 · Parent #314 |

## Problem

Imperion captures email and social conversations but nothing from **voice and meetings**. The majors (Gong, HubSpot conversation intelligence) transcribe calls and meetings, extract summaries, action items, sentiment, objections and deal-risk, and make the whole corpus searchable on the customer record. For an AI-first CRM this is a conspicuous gap — we already have the AI stack (ADR-0043) and a vector store (ADR-0041); we are simply not feeding voice into them.

## Context

- **Three plausible sources, different readiness.** (1) **ACS calls** — arriving with the telephony work, will be the primary voice channel. (2) **Teams meetings** — reachable via the per-client M365 app (ADR-0018) recordings/transcripts. (3) **Uploaded recordings** — manual, always-available fallback. Source priority is the main open decision.
- **The AI stack is settled (ADR-0043).** Claude (Haiku/Sonnet tiers) for analysis; Voyage voyage-3-large @1024 for embeddings (ADR-0041). No new provider — re-adding one needs an ADR. Transcription (speech→text) is *not* yet a settled component; Azure Speech is the candidate (diarized, in-region, no new vendor relationship).
- **Vectorization is canon-located.** ALL vectorization lives in `_LocalPipelineEnrichment`; transcripts embed there and surface through the gold knowledge citation views (ADR-0041), not in the frontend or backend.
- **Voice is sensitive.** Recording/transcribing a conversation engages consent and retention obligations — this must wire into the consent ledger (ADR-0014), not bolt on after.
- **It belongs on the timeline.** A conversation is an interaction; its summary should land on the unified interaction timeline (ADR-0011) alongside emails and tickets.

## Options considered

- **A. Buy a conversation-intelligence SaaS (Gong-style).** Fastest features, but a new vendor holding customer voice + a second AI stack outside ADR-0043, and weak coupling to our 360. Rejected: contradicts the settled-stack and data-custody posture.
- **B. Transcribe + analyze in-house on the settled stack (chosen).** Azure Speech → transcript; Claude → insights; Voyage → search. Reuses ADR-0041/0043, keeps voice in our tenancy, lands on our timeline and vector store. More to build, but on rails we already own.
- **C. Analysis only on externally-produced transcripts (e.g. Teams' own).** Cheapest, but coverage is hostage to each source's transcript quality and availability (ACS gives audio, not transcripts). Adopt as an *optimization* where a good transcript already exists, not as the architecture.

## Decision

1. **Pipeline shape: capture → transcribe → analyze → embed → surface.**
   - **Capture** audio/recording references from the source (ACS / Teams / upload).
   - **Transcribe** via Azure Speech (diarized, speaker-labeled) → a transcript artifact. Where a source already provides a high-quality transcript (Teams), use it and skip re-transcription (option C as optimization).
   - **Analyze** with Claude (tiered, ADR-0043): summary, action items, sentiment, objections, deal-risk signals — structured output onto `conversation_insight`.
   - **Embed** transcript segments in `_LocalPipelineEnrichment` with Voyage @1024 (ADR-0041) → gold knowledge + citation view.
   - **Surface** on contact/account/deal 360 and the interaction timeline (ADR-0011).

2. **Source priority: ACS-first, Teams-fast-follow, upload always.** ACS is the primary voice channel and the reason this epic is timed now; Teams meetings follow using existing M365 reach (ADR-0018); manual upload exists from day one as the unblocked path for piloting before ACS lands.

3. **Persistence: transcript as artifact, insights as rows.** Raw audio is *referenced*, not stored in Postgres. The transcript is an artifact (blob) with a row pointer; `conversation` (one per call/meeting), `conversation_segment` (diarized turns, the embedding unit), and `conversation_insight` (AI outputs) are relational. Bronze-per-source convention is unnecessary here — these are derived artifacts, not a polled external source.

4. **Backend orchestrates; it holds the tokens (ADR-0042).** The transcribe→analyze orchestration runs as a backend process; ACS/Teams/Speech credentials live in backend Key Vault. The frontend only reads for display.

5. **Consent + retention are first-class (ADR-0014).** A conversation cannot be transcribed without a consent basis recorded in the ledger; retention window is set per policy and enforced (transcript + segments purged on expiry, insights optionally retained in aggregate). This is part of slice 1, not a follow-up.

6. **Batch first, real-time later.** v1 processes after the call/meeting ends. Real-time (live transcription, in-call assist) is explicitly deferred.

**Table sketch (migration number assigned at implementation; verify on disk):**

```sql
conversation (
  id, account_id fk, contact_id fk null, deal_id fk null,
  source text check (source in ('acs','teams','upload')),
  external_ref text,            -- ACS call id / Teams meeting id / upload id
  audio_artifact_uri text null, transcript_artifact_uri text null,
  started_at, ended_at, duration_seconds int,
  consent_basis_id fk null,     -- ADR-0014 ledger
  retention_expires_at timestamptz null,
  status text check (status in ('captured','transcribed','analyzed','purged')), ...
)
conversation_segment (             -- diarized turn; the embedding unit
  id, conversation_id fk, speaker text, start_ms int, end_ms int,
  text text, ...                   -- embedded in _LocalPipelineEnrichment (ADR-0041)
)
conversation_insight (
  id, conversation_id fk,
  kind text check (kind in ('summary','action_item','sentiment','objection','risk')),
  payload jsonb, model text, created_at, ...
)
```

## Consequences

- Forecasting (#316) and deal 360 gain a voice-derived risk signal; conversational insights become a forecast input over time.
- Search over voice joins the existing gold knowledge corpus (ADR-0041) — one retrieval surface, not a parallel one.
- Transcription (Azure Speech) is a *new component* but not a new AI provider; it does not reopen ADR-0043.

## Future considerations

- Real-time / in-call assist and live next-best-action.
- Coaching analytics (talk-ratio, monologue, question rate) for internal enablement.
- Auto-linking a conversation to the right deal/contact when the external ref is ambiguous.
