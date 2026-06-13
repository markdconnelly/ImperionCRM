---
name: imperion-vector-contract
description: Imperion CRM's pinned embedding contract — Voyage voyage-3-large @ 1024 dims, chunking v1, versioned re-embeds, and who is allowed to embed what. Use when working with embeddings, vectors, pgvector, Voyage, knowledge_embedding, chunking, semantic search, or anything that creates, migrates, or queries vector data in any ImperionCRM repo.
---

# Imperion: the vector contract

The embedding stack is **settled** (front-end ADR-0041 · backend ADR-0034 ·
local-pipeline ADR-0009). It is one pair, one vector space; re-adding a provider or
changing any pinned value is a new ADR, not a config flip.

## Pinned constants (single source: `Get-ImperionVectorContract`)

Defined once in
`ImperionCRM_LocalPipelineEnrichment/src/ImperionPipeline/Private/Get-ImperionVectorContract.ps1`
— never restate these in code; read them from the contract:

| Constant | Value |
|---|---|
| Model | `voyage-3-large` |
| Dimension | **1024** (`Get-ImperionVoyageEmbedding` refuses any non-1024 vector) |
| Chunking | `v1` — 6000 chars max / 500 overlap (~1,500 tokens @ 4 chars/token), prefers paragraph boundaries |
| API | `https://api.voyageai.com/v1/embeddings`, max 64 inputs per call |
| Cost telemetry | $0.18 / 1M input tokens |

## The invariants

1. **Every vector row stamps** `embedding_model`, `dimension`, `chunking_version`;
   **every query filters on them** — vector spaces can never silently mix.
2. **Changes are versioned re-embeds, never in-place.** A model or chunking change bumps
   the version and re-embeds rows matching the OLD version pair; the vectorizer only
   ever touches rows matching its own version. Procedure:
   `ImperionCRM_LocalPipelineEnrichment/docs/database/vector-lifecycle.md`.
3. **Never re-bill an unchanged chunk.** Skip embedding when the content hash set is
   unchanged. Every run logs objects, chunks, billed tokens, estimated USD.

## Who embeds what (division of labor)

- **On-prem local pipeline:** ALL corpus embedding — composing gold, chunking, dedup,
  batching, retry, cost accounting, the pgvector upsert
  (`Invoke-ImperionKnowledgeSync -Vectorize`). Large backfills never touch Azure compute.
- **Backend:** embeds **queries only**, against the same contract, for semantic search
  and agent retrieval. Reads `knowledge_object` / `knowledge_embedding`; never writes them.
- **Front end:** holds **no AI key** (front-end ADR-0043). Renders results only.
- **Cloud Pipeline:** no AI code at all (pipeline ADR-0011).

## Key locations

Voyage key on-prem = SecretStore secret `embedding-provider-key`. Backend provider keys
live in Key Vault (`kv-imperioncrm-prd`). Keys never appear in any repo, DB row, or
front-end environment.

## Authoritative sources

Front-end ADR-0041 (the pinned contract) · backend ADR-0034 (settled AI stack) ·
local-pipeline ADR-0009 (Voyage direct, no router) and ADR-0004 (local orchestration) ·
`docs/database/vector-lifecycle.md` (local-pipeline repo). ADR numbers are per-repo —
qualify cross-repo references with the repo name.
