---
adr: 0090
title: "ADR ingestion overhaul — frontmatter, generated index, and decision consolidation"
status: accepted
date: 2026-06-16
repo: frontend
summary: "Add machine-readable frontmatter to every ADR, generate the README index + adr-index.json from it (CI-linted), and consolidate related decisions into retained dossiers."
tags: [meta]
---
# ADR-0090: ADR ingestion overhaul — frontmatter, generated index, and decision consolidation

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Cross-references** | ADR-0084 (claim-at-merge numbering), ADR-0086 (OKF frontmatter precedent), #754 |

## Problem
The decision record grew to ~89 ADRs across rapid parallel waves. Two failure modes emerged: (1) the hand-maintained index README drifted — ~30 ADRs were missing from it and a duplicate number (0058) survived; (2) closely-related decisions splintered across many small ADRs, so reconstructing "the current decision about X" means reading a dozen files and chasing amendment chains. Both make the canon expensive for humans and agents to ingest.

## Context
ADRs are immutable history (we supersede, never rewrite). The OKF semantic layer already proves machine-readable frontmatter + a generated, linted index works here. Numbers are claimed at merge (ADR-0084), so gaps are expected and acceptable.

## Decision
Three coupled changes:
1. **Machine-readable frontmatter** on every ADR: `adr, title, status, date, repo, summary, supersedes, superseded_by, consolidated_into, tags`. Existing body content is preserved; frontmatter is additive.
2. **Generated index + manifest.** `scripts/adr-index.mjs` regenerates the README index table (between markers) and emits `adr-index.json` from frontmatter. The hand-maintained table is retired. CI runs `--check` and fails on duplicate numbers, a drifted index, or malformed/missing frontmatter.
3. **Consolidation by dossier, originals retained.** Closely-related clusters are folded into one consolidated ADR ("dossier") that carries EVERY member decision plus a traceability table (source ADR -> section). Member files stay on disk with `status: consolidated` + `consolidated_into:`; they are never deleted, so history and inbound links survive. Amendment clauses are preserved verbatim; `Proposed`/partial-supersession states are preserved; cross-repo supersessions remain references, never absorbed (schema/decision single-owner rule, §1).

## Zero-loss guarantee
A decision is "lost" only if it appears in no active record. Every consolidation PR includes the traceability table mapping each source ADR's decision to its new home, and the member file is retained — so loss is structurally impossible and reviewable.

## Security / cost / operational impact
None — documentation tooling only. No secrets, schema, or runtime change. Slightly more CI time for the lint.

## Future considerations
- Dossiers are vectorized into gold alongside other knowledge (LocalPipeline) once stable.
- The same tooling can extend to sibling repos' decision-records.
