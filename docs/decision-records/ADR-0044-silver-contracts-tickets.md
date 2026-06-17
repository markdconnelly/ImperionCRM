---
adr: 0044
title: "Silver `contract` and `ticket` entities"
status: consolidated
date: 2026-06-09
repo: frontend
summary: "Migration 0050 adds typed silver `contract` + `ticket`, populated from bronze by the cloud pipeline's merge each sweep."
tags: [medallion]
consolidated_into: ADR-0092
---
# ADR-0044: Silver `contract` and `ticket` entities

> Consolidated into [ADR-0092](ADR-0092-medallion-data-platform-consolidated.md). Retained for history.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-09 |
| **Relates to** | ADR-0018 (the app reads silver), ADR-0039 (per-source bronze + precedence), local-pipeline ADR-0009 (the knowledge composers these feed), pipeline ADR-0011 (merge-sources, which populates them). |
| **Cross-references** | local-pipeline ADR-0009, pipeline ADR-0011 |

## Problem

Contracts and tickets lived only as local-pipeline bronze (`autotask_contracts` /
`autotask_tickets`, all-text envelope). The `/contracts` page and the knowledge
composers read bronze directly — typed dates/amounts were impossible, account/contact
links were recomputed at every read, and a second source (DocuSign contracts, manual
`website` rows) had nowhere to merge. Every other entity the app shows has a silver
tier; these two didn't.

## Options considered

1. **Silver tables + merge (chosen)** — consistent with every other entity; unblocks
   typed UI and multi-source merging.
2. Keep reading bronze. Rejected — the reasons above; bronze is access-controlled raw
   tier, not the app contract.
3. Views over bronze. Rejected — no typed columns without fragile casts in the view; no
   place for a second source's precedence.

## Decision

Migration **0050** adds silver `contract` + `ticket` (typed columns, `account_id` /
`contact_id` FKs, `UNIQUE (source, external_ref)`). The **cloud pipeline's
`merge-sources`** populates them from bronze each sweep — full-scan idempotent upsert
(the bronze envelope has no `matched_at`; at current volume a full pass is cheaper than
adding one). Text→typed parsing (dates, numerics) happens in the merge and parses
defensively: unparseable values land NULL, never fail the row. The `/contracts` page
moves from bronze to silver; future sources (DocuSign, `website` manual rows) merge in
under the ADR-0039 precedence convention.

Grants: web/backend SELECT · cloud pipeline SELECT/INSERT/UPDATE · on-prem SELECT (its
knowledge composers can later read silver instead of re-joining bronze).

## Consequences

**Security / cost / ops impact**

- **Security:** silver carries no payloads (raw stays in bronze); grants are read-only
  for readers.
- **Cost:** one extra 5-minute sweep step over ≤hundreds of rows — negligible.
- **Ops:** apply 0050, deploy the pipeline, and silver fills on the next sweep; the
  `/contracts` page shows silver immediately after.
