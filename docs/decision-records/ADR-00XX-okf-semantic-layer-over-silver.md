# ADR-00XX: OKF-format semantic layer over the silver tier

> **Placeholder number.** The real ADR number is claimed at merge (§10.3) — rename
> the file and fix references in the same rebase. Author against `00XX`.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-14 |
| **Cross-references** | ADR-0041 (vector contract) · ADR-0044 (silver merge pattern) · ADR-0082 (time) · ADR-0083 (expense) · ADR-0080 (opportunity merge) · CLAUDE.md §4 (bronze/silver/gold), §8 (read-only DB MCP / PII) |

## Problem

The *meaning* of a silver entity — its business definition, join paths, and the
source-of-record / authority rules that govern it — is scattered across ADRs,
migration comments, KQM, Autotask, and tribal knowledge. There is no single,
machine-uniform surface that answers "what is `time_record`, what does it join to,
and which source wins?" Every agent that needs this (the orchestrator, ICM
workspaces, the board) re-derives it from the §1 cross-repo contract plus source,
and every human re-reads three migrations. The data-model ERD
([data-model.md](../database/data-model.md)) captures *structure* but not the
curated business semantics, and it is one monolithic file rather than a
concept-per-file graph agents can traverse.

## Context

[OKF v0.1](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
(Open Knowledge Format, Google Cloud) formalizes the "LLM-wiki" pattern into a
vendor-neutral spec: a **bundle** is a directory of markdown files — one file per
**concept** (table, metric, dataset, runbook) — with YAML frontmatter for small
structured fields (`type`, `title`, `description`, `resource`, `tags`, `timestamp`)
and a markdown body for schema, joins, and business context. File path is concept
identity; normal markdown links form a relationship graph richer than the
directory tree. It is **a format, not a service**: no SDK to produce, no
integration to consume, version-controlled alongside code, readable by humans and
parseable by agents from the same file.

This is a strong fit for our gap because:

- OKF markdown links cross repo boundaries, where the Graphify global graph has
  **zero cross-repo edges** ([graphify trial verdict] — CLAUDE.md §7). The
  semantic layer is exactly the cross-repo knowledge Graphify cannot represent.
- OKF documents are the right shape to vectorize under the **ADR-0041** contract
  (Voyage `voyage-3-large` @ 1024 dims) and serve as curated RAG context — a
  human-edited corpus that beats raw schema dumps.
- It is additive and decision-shaped: adopt the *format* for one bundle, owned in
  this repo alongside the schema it documents (§1 makes this repo the schema SoR).

Four constraints were settled with Mark before this draft:

1. **Not a Graphify replacement.** OKF is the *meaning* layer above the code graph
   and the database; it computes nothing and holds no live data.
2. **PII → live queries, never static.** Any answer involving row-level or personal
   data is resolved against the live read-only `postgres` MCP at query time (§8) —
   never baked into a bundle file.
3. **Staleness is owned by the backend pipeline,** not by hand. An enrichment step
   keeps bundle docs synced to migrations; hand-maintenance alone is rejected.
4. **No code knowledge in OKF.** Code-graph / architecture / build knowledge stays
   private to CLAUDE.md, ADRs, and Graphify. OKF covers the *data/semantic* layer
   only.

## Options considered

1. **Extend `data-model.md`.** Keep one monolithic ERD doc, add prose for
   semantics. Cheapest, but stays a single non-traversable file, not a per-concept
   graph, and mixes structure with business meaning.
2. **A proprietary metadata catalog** (e.g. a data-catalog product). Solves
   discovery but reintroduces vendor lock-in and an SDK/integration burden, and
   does not version alongside our migrations — counter to §1 and the docs-as-code
   standard (§8).
3. **Adopt the OKF format for a silver semantic-layer bundle.** Markdown +
   frontmatter, one concept per file, in this repo next to the schema, vectorizable
   under ADR-0041, enrichment-maintained by the pipeline. **Chosen.**

### Tradeoffs

Option 3 adds a curated surface that can drift if the enrichment step lapses —
mitigated by constraint 3 (pipeline-owned sync) and by keeping the bundle small
and PII-free so the live DB remains the answer for anything volatile or personal.
It is strictly additive: it does not replace the ERD (structure of record), the
migrations (schema SoR), Graphify (code graph), or the DB (data SoR).

## Decision

Adopt the **OKF v0.1 format** as the standard for a **semantic layer over the
silver tier**, materialized as an OKF bundle under
[`docs/database/semantic-layer/`](../database/semantic-layer/), owned in this repo.

**Conformance rules for the bundle:**

- One markdown file per silver concept; **file path is concept identity**.
- Required frontmatter: `type`, `title`, `description`, `resource` (link to the
  governing ADR or migration), `tags`, `timestamp`. Body carries the schema table,
  **join paths**, and the **source-of-record / authority rule** for that entity.
- Cross-link related concepts with markdown links; `index.md` provides progressive
  disclosure at each directory level.
- **No row-level data, no PII, no secrets, no client identifiers** — only schema,
  business semantics, and redacted/aggregate illustrative examples. Volatile or
  personal answers are deferred to the live read-only `postgres` MCP (§8).
- **No code/architecture knowledge** — that surface is CLAUDE.md / ADRs / Graphify.

**Pilot scope (this PR):** the three recently shipped silver entities —
`time_record` (ADR-0082), `expense_item` (ADR-0083), `opportunity` (ADR-0080
merge) — plus a bundle `index.md`. Expansion beyond these three, the
enrichment-agent implementation, and vectorization are deliberately deferred to
follow-up issues so this stays a micro-PR.

## Consequences

### Security impact

Net-positive if the constraints hold. The bundle is a public-to-the-repo artifact,
so the PII boundary is load-bearing: the conformance rules forbid row-level data,
personal data, secrets, and client identifiers, and route every such question to
the read-only DB at query time (§8 already enforces aggregate/redact-only). The
enrichment agent that maintains the bundle (follow-up) must obey the same §8 rule
when walking prod — unlike OKF's reference enrichment agent, which walks BigQuery
freely. No new attack surface: it is markdown in git.

### Cost impact

Negligible authoring cost (markdown). Future vectorization rides the existing
ADR-0041 pipeline and on-prem embedding budget — no new provider, no new key.

### Operational impact

A new doc surface the pipeline must keep synced to migrations (constraint 3); the
sync mechanism is a follow-up in the pipeline / local-pipeline repos. Until that
lands, the pilot bundle is hand-authored and carries its `timestamp` as the
freshness signal. The bundle becomes a required update target on silver-schema
changes, like the ERD.

## Future considerations

- **Enrichment-agent sync** (pipeline / local-pipeline) to keep the bundle current
  with migrations — the staleness owner per constraint 3.
- **Vectorization** of the bundle into the gold tier under the ADR-0041 contract,
  so the orchestrator/ICM/board agents retrieve curated semantics as RAG context.
- **Expansion** to the full silver tier (contact, account, device, ticket,
  contract, …) once the pattern proves out on the three pilot entities.
- A **static HTML graph visualizer** over the bundle (OKF reference impl) if a
  human-browsable view is wanted — single file, no backend.
