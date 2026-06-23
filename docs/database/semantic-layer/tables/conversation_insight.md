---
type: Silver Table
title: conversation_insight
entity: conversation_insight
archetype: G
description: An AI-derived finding over a captured conversation (summary / action_item / sentiment / objection / risk) — gold output the app and forecasting read directly.
resource: ../../../decision-records/ADR-0068-conversational-intelligence-pipeline.md
tags: [silver, gold, communications, conversation_insight, ai]
data_class: client_pii
timestamp: 2026-06-22T00:00:00Z
---

# conversation_insight

A single **AI-derived finding** over a captured [`conversation`](conversation.md): a
summary, an action item, a sentiment read, an objection, or a risk. Produced in the
`analyzed` stage of the conversational-intelligence pipeline; one row per finding, with
the producing model recorded. Child of `conversation` (the header); governed by
[ADR-0068](../../../decision-records/ADR-0068-conversational-intelligence-pipeline.md).

## Source of record / authority

**Gold, AI-derived; the backend analyze stage is the producer.** Rows are written by the
backend conversational-intelligence pipeline using **Claude** (ADR-0043; the producing
tier is stamped in `model`), reasoning over the conversation's transcript/segments — the
front end only reads. The polymorphic pointer is `(conversation_id, kind)`; `payload`
holds the kind-specific shape and can grow without a migration. Unlike the
[`knowledge_object`](knowledge_object.md) gold tier, an insight is **not itself
vectorized** — the diarized [`conversation_segment`](conversation_segment.md) turns are
the embedding unit; insights are structured findings read directly. Retained per the
parent's retention policy (insights may be kept in aggregate after transcript purge,
ADR-0068 decision 5).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `conversation_id` | uuid | FK → `conversation` (ON DELETE CASCADE) — the owning call/meeting |
| `kind` | text | CHECK — exactly one of `summary` · `action_item` · `sentiment` · `objection` · `risk` |
| `payload` | jsonb | kind-specific shape (default `{}`); e.g. summary text, action-item assignee/due, sentiment score, objection/risk detail — **may carry sensitive client content** |
| `model` | text | the Claude tier that produced it (ADR-0043); nullable for non-model-authored rows |
| `created_at` | timestamptz | |

## Joins

- `conversation_id` → [`conversation`](conversation.md) (CASCADE); the header carries the
  account/contact/opportunity links and consent/retention.
- Sibling: [`conversation_segment`](conversation_segment.md) (the diarized turns the
  analysis runs over; the embedding unit).
- **Downstream:** `risk` / `objection` insights feed forecasting (#316); a `summary`
  lands on the unified `interaction` timeline (ADR-0011).

## Notes

`payload` (and some summaries) are **sensitive client conversation content**. PII-free
here by design; resolve specifics against the live read-only DB (CLAUDE.md §8). Insights
are AI-generated — treated as derived signal, not ground truth; the authoritative record
is the conversation + its consent basis.
