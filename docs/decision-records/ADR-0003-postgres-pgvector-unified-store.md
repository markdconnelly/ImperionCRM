# ADR-0003: PostgreSQL + pgvector as the unified data store

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-06 |
| **Cross-references** | — |

## Problem

Choose a data platform supporting relational, semantic/vector, knowledge-graph,
agent-memory, and document-intelligence workloads.

## Context

Traditional CRUD is insufficient; AI workloads are required from the start. A
bronze/silver/gold enrichment pipeline feeds agent reasoning (Gold).

## Options considered

- PostgreSQL + pgvector as a single store for record, metadata, embeddings, memory.
- Separate relational DB + dedicated vector DB.

### Tradeoffs

A dedicated vector DB can scale vectors independently but adds a system, sync, and
operational burden. Postgres + pgvector keeps one transactional, well-understood
store with adequate vector support at current scale.

## Decision

Use PostgreSQL with pgvector as system of record, metadata store, embedding store,
and agent-memory layer.

## Consequences

### Security impact

One store to secure, back up, and audit; row-level controls and encryption in one place.

### Cost impact

Single managed database vs. multiple specialized services.

### Operational impact

Single backup/restore/DR story; one migration path.

## Future considerations

Revisit a dedicated vector store if vector scale or latency outgrows pgvector.
