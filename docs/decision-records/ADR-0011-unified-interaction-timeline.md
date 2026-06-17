---
adr: 0011
title: "Unified interaction timeline with staged enrichment"
status: accepted
date: 2026-06-07
repo: frontend
summary: "A single append-only `interaction` table is the timeline, carrying bronze payloads, silver columns, and gold summaries."
tags: [crm-core]
---
# ADR-0011: Unified interaction timeline with staged enrichment

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

Decide how to store a client's "lifetime history" — every email, SMS, Teams
message, Plaud call, meeting, note, and system event — so it powers both the UI
timeline and agent retrieval, and is cheap to extend with new sources.

## Context

CLAUDE.md §4 mandates a bronze→silver→gold pipeline. Sources are heterogeneous and
will grow; agents must read AI-ready ("gold") data, not raw payloads. Some payloads
(call audio, attachments) are large binaries.

## Options considered

1. **One append-only `interaction` event stream** with staged columns.
2. Typed table per channel (emails, calls, messages…) unioned into a view.

### Tradeoffs

- (1) one timeline query; new sources need no new table; uniform place for
  bronze (`payload_bronze` JSONB) → silver (normalized columns) → gold
  (`summary_gold` + a row in `interaction_embedding`, pgvector). Less rigid typing.
- (2) rigid per-type columns but every source is a migration and cross-source agent
  retrieval is harder.

## Decision

A single append-only **`interaction`** table is the timeline. Each event carries
source/channel/direction, FK links to account/contact/opportunity, `payload_bronze`,
normalized silver columns, and a gold `summary_gold`; embeddings live in
`interaction_embedding` (with the embedding `model` recorded). **Large blobs live in
object storage** (Azure Blob / SharePoint) with a `blob_ref` pointer in the row, not
in the database.

## Consequences

### Security impact

PII flows through here; rows are PII-tagged and access is audit-logged (ADR-0016).
Blob storage uses its own access controls; only references live in Postgres.

### Cost impact

pgvector index storage; object-storage for blobs (cheaper than DB for binaries).

### Operational impact

Enrichment workers (silver/gold) run async. Re-embedding on model change is a batch
job keyed on `interaction_embedding.model`. Chunking + retention policy is an open
item.

## Future considerations

Per-source retention tiers; partitioning `interaction` by time as volume grows.
