---
type: OKF Bundle
title: Silver semantic layer
description: Curated business meaning, join paths, and source-of-record rules for the silver tier — human- and agent-readable, version-controlled, PII-free.
resource: ../../decision-records/ADR-0086-okf-semantic-layer-over-silver.md
tags: [silver, semantic-layer, okf, data-model]
timestamp: 2026-06-14T00:00:00Z
---

# Silver semantic layer (OKF bundle)

An [OKF](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
bundle — one markdown file per silver concept — that captures what a silver entity
**means**, what it **joins to**, and which source is **authoritative**. Standard:
[ADR-0086](../../decision-records/ADR-0086-okf-semantic-layer-over-silver.md).

This layer is *meaning*, not *structure* and not *data*:

- **Structure** lives in [data-model.md](../data-model.md) (the ERD) and the
  [migrations](../../../db/migrations) (the schema source of record).
- **Data** lives in the database. **No row-level data or PII appears here** — any
  personal or volatile answer is resolved against the live read-only `postgres`
  MCP at query time (CLAUDE.md §8). Examples below are illustrative and redacted.
- **Code knowledge** is out of scope — that is CLAUDE.md / ADRs / Graphify.

## Concepts (pilot)

| Concept | Authoritative source | Governing ADR |
|---|---|---|
| [`time_record`](tables/time_record.md) | website attendance (Autotask corroborates) | ADR-0082 |
| [`expense_item`](tables/expense_item.md) | website out-of-pocket / MileIQ miles | ADR-0083 |
| [`opportunity`](tables/opportunity.md) | website > Autotask > KQM (precedence) | ADR-0080 |

Pilot scope is these three recently shipped entities. Expansion to the full silver
tier, enrichment-agent sync, and vectorization are tracked as follow-ups.
