---
type: OKF Reference
title: Concept-file authoring standard
description: The required shape, depth bar, and archetype-keyed sections every OKF concept file under tables/ must follow. Codifies ADR-0086 conformance.
resource: ../../decision-records/ADR-0086-okf-semantic-layer-over-silver.md
tags: [semantic-layer, okf, authoring, standard, conformance]
timestamp: 2026-06-15T00:00:00Z
---

# Concept-file authoring standard

Every file under [`tables/`](tables/) is one silver (or gold) entity's **meaning**. This
is the contract for writing one so the bundle stays consistent and the
[#535 docs-gate](../../operations/semantic-layer-gate.md) has a fixed bar to hold against.
Governing decision: [ADR-0086](../../decision-records/ADR-0086-okf-semantic-layer-over-silver.md).
Gold-standard exemplars: [`account`](tables/account.md), [`contact`](tables/contact.md),
[`opportunity`](tables/opportunity.md) (archetype A) and [`posture_snapshot`](tables/posture_snapshot.md),
[`knowledge_object`](tables/knowledge_object.md), [`connection`](tables/connection.md) (other archetypes).

## Hard boundaries (ADR-0086 — never cross)

- **No row-level data, no PII, no client identifiers, no secrets.** Personal or volatile
  answers resolve against the live read-only `postgres` MCP at query time (CLAUDE.md §8).
- **No code knowledge.** That is CLAUDE.md / ADRs / Graphify. *Meaning-level* contracts
  ARE in scope — match keys + confidences, idempotency keys, view names, precedence —
  because they answer "which source wins / how do rows join / how authoritatively". A
  bare pointer to a deciding module (e.g. `pollDue()`, `lib/forecast.ts`) is tolerated as
  an authority pointer; function bodies and file walkthroughs are not.
- **Meaning, not structure.** Structure is the [ERD](../data-model.md) + migrations; this
  layer never restates DDL for its own sake.

## Required sections (every file)

1. **Frontmatter** — `type` · `title` (= entity name) · `description` (one line, names the
   archetype behaviour) · `resource` (relative path to the governing ADR) · `tags`
   (`[silver|gold, domain, entity, archetype-hint]`) · `timestamp` (ISO-8601 `…Z`; bump on
   every content change — the gate's minimum).
2. **`# <entity>` + definition** — one short paragraph: what the entity *means* (the thing
   the app reasons over), the governing ADR link, and a pointer to its union view /
   migration / child tables.
3. **`## Source of record / authority`** — which source wins and *why*. Archetype-specific
   (see below). This is the most important section: an agent reads it to know what to trust.
4. **`## Schema`** — `| Column | Type | Notes |` table. **Enumerate every enum's values**
   (not "enum — the stage"). Explain non-obvious columns. Name FK targets in Notes. Flag
   PII / sensitive columns. Omit purely mechanical columns only if they carry no meaning.
5. **`## Joins`** — name every FK and its target; state authority where a join carries
   meaning (e.g. "the axis forecasts group by"). Include child tables, derived views, and
   downstream consumers (executors, gates, roll-ups).
6. **`## Notes`** — the PII / sensitivity statement and the standing "resolve specifics
   against the live read-only DB" line.

## Conditional sections (by doctrine archetype)

Archetypes are defined in [coverage-matrix.md](coverage-matrix.md) /
[data-and-automation-doctrine.md](../../architecture/data-and-automation-doctrine.md).

| Archetype | Authority must state | Add section(s) |
|---|---|---|
| **A** multi-source merge | the **precedence** order + the resurrection guard | **`## Bronze match / merge`** — match keys + confidences + recompute-by-precedence; and/or **`## Bronze union (shape)`** — per-source field contributions + cross-source join key |
| **B** single-SoR | which system is SoR; for an **external** SoR (Autotask/DocuSign/QBO) what is mirrored vs authoritative, and the write-back direction | — |
| **C** ledger | **append-only/immutable** (a change of mind is a new row) + the derived "current/latest" view; INSERT-only grant where it applies | note the derived view in Joins |
| **D** write-back sidecar | the **idempotency key**, the external write target, and the autonomy-dial state | — |
| **E** golden/drift | **observed vs human-approved golden** + how the verdict is computed | — |
| **F** reconciliation | the **two sides** matched + the match rule + what a deviation means | — |
| **G** gold | the **producer** (on-prem), the polymorphic pointer, the embedding contract (Voyage `voyage-3-large` @ 1024d), draft/published, `content_hash` idempotency | — |
| **H** reference/config/identity | the SoR for config; for token-bearing records, the **secret-by-reference** rule (Key Vault ref, never the value) | — keep minimal |

## Depth bar (the test)

A file passes when a knowledgeable engineer or an agent can, from it alone: pick the
**authoritative source** for any field, **join** it correctly to its neighbours, read
**every enum's** allowed values, and know the **PII** boundary — without opening the
schema. If any of those needs a trip to the migrations, the file is below bar.

## Process

Changing a concept file is a normal unit of work (issue → worktree → micro-PR). A PR that
changes a silver entity's shape / source-of-record / joins updates the matching file
(≥ `timestamp`) **and** its `coverage-matrix.md` row in the **same** PR — mechanically
enforced by the [#535 gate](../../operations/semantic-layer-gate.md). A new silver entity
gets a new file (this standard) + a matrix row.
