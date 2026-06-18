---
adr: 0102
title: "The pinned vector contract lives in one machine-readable home; siblings consume it"
status: accepted
date: 2026-06-18
repo: frontend
summary: "Resolves #892 (architecture-deepening review). The vector contract (voyage-3-large / 1024 / chunking v1, plus chunking + Voyage-API shaping) was re-declared as executable copies in three repos: backend model-router.ts VECTOR_CONTRACT, local-pipeline Get-ImperionVectorContract.ps1, and migration 0045's vector(1024). A bump meant three coordinated, easily-forgotten edits. This repo (which owns the schema/contracts, §1) now publishes ONE machine-readable home, db/contracts/vector-contract.json, with a typed front-end loader that fails loud if absent and a drift test that asserts it matches migration 0045. Siblings vendor a committed copy (no cross-repo runtime dependency) and a CI step verifies the vendored copy against the canonical raw URL, failing the build on drift. Consumer cutovers are separate sibling micro-PRs (backend + local-pipeline). Honours ADR-0041 / ADR-0043 / backend ADR-0034 / ADR-0042."
tags: [medallion, ai-stack]
---
# ADR-0102: The pinned vector contract lives in one machine-readable home; siblings consume it

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-18 |
| **Cross-references** | ADR-0041 (gold vector store, consolidated into ADR-0092); ADR-0043 (settled AI stack); backend ADR-0034 (model router); ADR-0042 (four-repo division); resolves #892 |

## Problem

The pinned vector contract — `voyage-3-large` · `1024` dims · chunking `v1`, plus the
chunking policy (6000 chars / 500 overlap) and Voyage API shaping (batch size, base URI,
cost rate) — is the one invariant that lets every embedding write and every similarity
query agree on a single vector space (ADR-0041). Yet it was **re-declared as executable
copies in three repos**:

- backend `src/shared/model-router.ts` → `VECTOR_CONTRACT` (the filter triple);
- local-pipeline `Get-ImperionVectorContract.ps1` (the full producer contract);
- this repo's migration `0045_gold_knowledge_vectors.sql` → the `vector(1024)` column.

**Deletion test:** delete the backend and local copies and the contract still exists
(ADR-0041 + the migration) — the copies are pure restatement. A bump (new chunking version,
new model) means three coordinated, easily-forgotten edits with no locality and high silent-
drift risk: nothing fails if one repo is forgotten until query results quietly degrade.

## Context

- **One repo owns the schema and contracts** (system CLAUDE.md §1): this front end. The
  siblings are consumers, never co-owners — the same rule as migrations (ADR-0017) and the
  OKF semantic layer (ADR-0086). The contract belongs here.
- **The repos are separate, deployed to separate machines.** The backend is a bundled
  Azure Function; the local pipeline runs on-prem. None can read a file from this repo at
  runtime — so "one home" cannot mean a shared runtime read.
- **A contract change is rare and heavyweight** — a system-wide *versioned re-embed* event
  (ADR-0041), not a config flip. The cost to optimise away is silent drift, not edit volume.
- **The front end embeds nothing** (it holds no AI key, ADR-0043) but it *is* a declarer of
  the contract via the schema, so it has a real consume-and-verify obligation of its own.

## Options considered

1. **Leave the three copies; rely on discipline + ADR-0041.** Status quo. Zero locality;
   the drift the review flagged stays latent.
2. **Publish the contract as a versioned package** (npm for TS, a PS module for PowerShell)
   each sibling depends on. True single artifact, but invents a publish/versioning pipeline
   and a release coordination step for a value set that changes a few times a year — over-
   built for the need.
3. **One machine-readable home in this repo; siblings vendor a copy that CI verifies against
   the canonical (chosen).** `db/contracts/vector-contract.json` is the single source of
   truth. The front end loads it with a fail-loud typed loader and a drift test against
   migration 0045. Each sibling commits a vendored copy (read at runtime — no cross-repo
   network dependency in the hot path) and a CI step compares it to the canonical raw URL,
   failing the build on drift.

### Tradeoffs

Option 3 keeps a *physical* copy in each sibling, but the copy is no longer a hand-authored
restatement — it is a verified mirror of one source, and divergence is a hard CI failure
rather than a silent miss. A bump becomes: edit this one file → every sibling's CI goes red
until it re-vendors → the coordination is enforced and visible. That is the locality Option 1
lacks without the release machinery Option 2 imposes. The residual cost — a re-vendor PR per
sibling on a bump — is exactly the coordination we *want* surfaced, and it matches the rhythm
of a versioned re-embed (which already touches every repo).

## Decision

**Option 3.** Publish `db/contracts/vector-contract.json` as the single machine-readable home
for the pinned vector contract. It carries the filter triple (`embeddingModel`, `dimension`,
`chunkingVersion`), the chunking policy, the Voyage API shaping, and the cost rate — the
superset of all three former declarations — and **no secrets** (provider keys stay in Key
Vault / SecretStore).

- **Front end (this repo):** `src/lib/contracts/vector-contract.ts` loads and validates the
  JSON, throwing if it is absent or malformed — the reference fail-loud consumer. A vitest
  drift test asserts the contract `dimension` equals the `vector(N)` declared by migration
  0045, so the home and the schema can never silently disagree.
- **Siblings (separate micro-PRs):** vendor a committed copy, read it at runtime with a
  fail-loud loader, and add a CI step that verifies the vendored copy against the canonical
  raw URL. Cutovers are filed as consumer follow-ups in `ImperionCRM_Backend` (replace the
  hard-coded `VECTOR_CONTRACT`) and `ImperionCRM_LocalPipelineEnrichment` (replace the
  hard-coded values in `Get-ImperionVectorContract.ps1`). Held for Mark per the sibling-repo
  merge rule.
- **Changing the contract** follows `db/contracts/README.md`: bump `chunkingVersion` and/or
  `embeddingModel` (a *dimension* change additionally needs a new `vector(N)` column +
  migration), never edit in place against existing rows, then re-vendor each sibling and
  update `docs/database/vector-lifecycle.md`.

## Consequences

### Security impact

None new. The contract is public shape only — explicitly no secrets, no PII, no client
identifiers (the file documents that provider keys live in Key Vault / SecretStore). The
fail-loud loaders make a missing/corrupt contract a hard error rather than a silent fallback
to a wrong vector space.

### Cost impact

None. No new infrastructure. Avoids the publish-pipeline cost of Option 2. Prevents the
real latent cost of drift — a forgotten copy embedding into the wrong space, which would
mean a corrective re-embed (billed) plus degraded retrieval until caught.

### Operational impact

A contract bump is now a single edit in this repo that turns every sibling's CI red until it
re-vendors — the coordination is enforced, not remembered. This is the only behavioural
change; runtime paths are unaffected until the sibling cutovers land.

## Future considerations

- If a third cross-repo contract appears, `db/contracts/` is the established home and this
  vendored-copy-plus-CI-verify pattern generalises.
- If the sibling count or bump frequency grows enough to justify it, revisit Option 2 (a
  published versioned artifact) — the JSON home is already the natural package payload.
- A dimension change remains a schema migration (fixed-width `vector(N)`), tracked in
  `docs/database/vector-lifecycle.md` per ADR-0041.
