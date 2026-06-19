---
type: Silver Table
title: proposal
entity: proposal
archetype: B
description: Quote/proposal for an opportunity — website system of record, versioned status lifecycle.
resource: ../../../decision-records/ADR-0019-proposal-lifecycle-model.md
tags: [silver, sales, proposal]
timestamp: 2026-06-15T01:00:00Z
---

# proposal

The proposal/quote document attached to an opportunity. Born silver — the app is the
source of record (no external merge). Governed by
[ADR-0019](../../../decision-records/ADR-0019-proposal-lifecycle-model.md).

## Source of record / authority

**Website system of record.** Status is a state machine: `draft` → `sent` → `accepted` /
`declined`. `sent_at` and `decided_at` stamp transitions; a decision is terminal.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `opportunity_id` | uuid | FK → `opportunity` |
| `title` | text | |
| `status` | enum | draft / sent / accepted / declined |
| `amount_mrr` | numeric | monthly recurring value |
| `document_url` | text | proposal artifact link |
| `sent_at` / `decided_at` | timestamptz | lifecycle stamps |
| `esign_status` | text? | e-sign mirror (ADR-0071): created/sent/delivered/completed/declined/voided; NULL = no envelope sent |

## Joins

- `opportunity_id` → `opportunity` (and through it to `account`).
- An accepted proposal feeds the sale→delivery path (provisioning, ADR-0080/0081).
- `esign_envelope.proposal_id` → this proposal (ADR-0071): the DocuSign envelope(s) for
  signature. `esign_status` is a denormalized mirror of the active envelope's status for
  fast read — the envelope is the source of record; ADR-0019 owns `status` (the lifecycle
  enum), separately.

## Notes

Proposal titles, amounts, and document links can carry client/commercial identity — keep
specific values out of this doc; resolve against the live read-only DB.
