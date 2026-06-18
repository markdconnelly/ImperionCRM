# Cross-repo machine-readable contracts

This directory is the **single home** for pinned, cross-repo contracts that more than one
repo must agree on byte-for-byte. The front end owns the schema and these contracts
(system CLAUDE.md §1); the siblings are **consumers**, never co-owners. This mirrors the
schema-ownership rule and the OKF semantic-layer canon (§11): one home, zero drift.

## `vector-contract.json` — the pinned vector contract

The embedding contract — `embeddingModel` · `dimension` · `chunkingVersion`, plus the
chunking policy and Voyage API shaping — pinned system-wide (ADR-0041, consolidated into
ADR-0092; backend ADR-0034). Before this file, the same values were re-declared as
executable copies in three places (backend `src/shared/model-router.ts` `VECTOR_CONTRACT`,
local-pipeline `Get-ImperionVectorContract.ps1`, and the `vector(1024)` column in migration
`0045_gold_knowledge_vectors.sql`). A bump meant three coordinated, easily-forgotten edits.

Now there is **one home** (the contract-home decision is ADR-0102). The rule:

| Consumer | Reads | Fails loudly when |
|---|---|---|
| **Front end** (this repo) | the JSON + migration 0045 | a drift test asserts `dimension` here equals the `vector(N)` the migration declares (`src/lib/contracts/vector-contract.test.ts`) |
| **Backend** (`ImperionCRM_Backend`) | a vendored copy bundled at build | the loader throws if the file is absent/invalid; CI verifies the vendored copy against this canonical and fails on drift |
| **Local pipeline** (`ImperionCRM_LocalPipelineEnrichment`) | a vendored copy in the module | `Get-ImperionVectorContract` throws if the file is absent/invalid; CI verifies against this canonical and fails on drift |

Siblings **vendor** a committed copy (no cross-repo network dependency in the hot path) and
a CI step compares it to this canonical file (raw GitHub URL). So a bump becomes: edit this
ONE file → every sibling's CI goes red until it re-vendors → the coordination is enforced
and visible instead of silent. Runtime never reaches across repos.

### Changing the contract

A change here is a **system-wide versioned re-embed event**, not a config tweak:

1. Bump `chunkingVersion` (chunking change) and/or `embeddingModel` (model change), and
   `contractVersion`. A **dimension** change additionally needs a new `vector(N)` column +
   migration (pgvector columns are fixed-width) — see ADR-0041.
2. Never edit values in place against existing rows; old and new versions coexist behind the
   one HNSW index (queries filter on the triple) until the new version is verified, then the
   superseded rows are pruned (local-pipeline §7 retention).
3. Re-vendor in each sibling (their CI is already red) and reflect the change in
   `docs/database/vector-lifecycle.md`.

**No secrets, ever.** Provider keys live in Key Vault (backend) / SecretStore (local
pipeline). This file holds only the public contract shape.
