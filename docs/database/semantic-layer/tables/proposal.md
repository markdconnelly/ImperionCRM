---
type: Silver Table
title: proposal
description: Quote/proposal for an opportunity — website system of record, versioned status lifecycle.
resource: ../../../decision-records/ADR-0019-proposal-lifecycle-model.md
tags: [silver, sales, proposal]
timestamp: 2026-06-14T00:00:00Z
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

## Joins

- `opportunity_id` → `opportunity` (and through it to `account`).
- An accepted proposal feeds the sale→delivery path (provisioning, ADR-0080/0081).

## Notes

Proposal titles, amounts, and document links can carry client/commercial identity — keep
specific values out of this doc; resolve against the live read-only DB.
