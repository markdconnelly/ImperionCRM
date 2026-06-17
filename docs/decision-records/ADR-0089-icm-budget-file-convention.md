---
adr: 0089
title: "ICM least-privilege budget files (CONSTITUTION.yaml + domains/<d>/room.yaml)"
status: consolidated
date: 2026-06-16
repo: frontend
summary: "Ratify the ICM budget-file convention — name/location/`{tools, okf_rooms}` shape of the two files, and the \"absent budget ⇒ next-lower declared list\" degradation rule; extends ADR-0088 §3."
tags: [agent-icm]
consolidated_into: ADR-0091
---
# ADR-0089: ICM least-privilege budget files (CONSTITUTION.yaml + domains/<d>/room.yaml)

> Consolidated into [ADR-0091](ADR-0091-agent-icm-platform-consolidated.md). Retained for history.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Cross-references** | ADR-0088 (ICM runtime + agent.yaml manifest, amended/extended) · ADR-0061 (ICM factory) · ADR-0086 (OKF rooms) · ADR-0060 (skills/manifests replicate — no secrets/PII) · backend ADR-0036 (loader, superseded for the loop by ADR-0088) |

## Problem

The agent.yaml conformance gate (`scripts/agent-yaml-gate.mjs`, ADR-0088 / issue
#699) enforces the least-privilege invariant

```
workflow.tools     ⊆ domain.tools     ⊆ Constitution
workflow.okf_rooms ⊆ domain.okf_rooms ⊆ Constitution
```

against two machine-readable **budget files**:

- `icm/CONSTITUTION.yaml` — the OUTER tools/okf_rooms allow-list.
- `icm/domains/<domain>/room.yaml` — the domain budget that narrows it.

These files were introduced *by the gate* and first authored in the domain-tier
pilot (#701, `icm/domains/sales/`). The **clauses** they enforce are ratified
(ADR-0088 §3 — "workflow ⊆ domain ⊆ Constitution"; `CONSTITUTION.md` §3/§5). But
the **budget-file convention itself** — the filenames, their location, the
`{tools, okf_rooms}` shape, and the gate's "absent budget ⇒ bound is the
next-lower declared list" degradation rule — is only documented in
`docs/agents/agent-yaml-schema.md` and lives as a comment in the gate. It is a
gate-implementation detail, not a settled decision. Anyone could rename or
relocate these files, change their shape, or alter the degradation semantics
without an ADR saying otherwise. This ADR promotes the convention to a ratified
decision.

## Context

ADR-0088 makes least-privilege **structural, not prose**: the Claude API (and the
CMA agent object) carry `tools`/`okf_rooms` as structured fields, and a prompt is
not an enforcement surface. The per-workspace `agent.yaml` declares one worker's
allow-list; `icm/agent.schema.json` (JSON Schema, draft-07) defines that single
file's **structure**. But the invariant ADR-0088 §3 mandates is **cross-file** —
a workflow's allow-list must be a subset of its domain's, which must be a subset
of the Constitution's. A single-file schema cannot express a relationship that
spans three files, so two more machine-readable artifacts are required: an outer
budget (the Constitution) and a per-domain budget (the room). These are the
"budget files."

The tier hierarchy mirrors the prose composition (`CONSTITUTION.md` → domain
`room.md` → workflow `prose.md`, ADR-0088 §3.2): each YAML budget is the
machine-readable companion of the prose at the same tier. The Constitution is the
single place a NEW capability enters the agent layer; the domain narrows it; the
workflow narrows further. The gate (`scripts/agent-yaml-gate.mjs`) is the CI
mirror of the loader's checks (Backend #162) — the same exported pure functions —
so the loader and CI never drift.

## Options considered

1. **Leave it as a gate detail.** The convention works and is described in
   `docs/agents/agent-yaml-schema.md`; do nothing.
2. **Amend ADR-0088** to absorb the budget-file convention into §3.
3. **Add a focused ADR** that ratifies the budget-file convention and references
   ADR-0088 for the invariant it serves.

### Tradeoffs

(1) keeps the convention undecided — its location, shape, and degradation rule
remain reversible without review, which is exactly the gap #716 names; a future
session could silently move or reshape a security-critical file. (2) keeps one
record but bloats ADR-0088 (already broad: runtime, domain tier, manifest,
sandbox) and muddies its "what changed" — the budget files are a narrower,
separable concern that postdates the ADR-0088 decision. (3) keeps ADR-0088 as the
*why we enforce a subset invariant* and makes this ADR the *why the budget files
have exactly this name/shape/degradation* — a clean, citable, separable decision
at the cost of one more ADR number. We choose (3): it matches the repo's
one-decision-per-ADR discipline and gives the convention its own stable citation.

## Decision

Ratify the ICM budget-file convention as a settled decision. It has four parts.

### 1. File naming + location

| File | Location | Tier | Companion prose |
|---|---|---|---|
| `CONSTITUTION.yaml` | `icm/CONSTITUTION.yaml` | outer (Constitution) | `icm/CONSTITUTION.md` |
| `room.yaml` | `icm/domains/<domain>/room.yaml` | domain | `icm/domains/<domain>/room.md` |

Names and locations are fixed. There is exactly one `CONSTITUTION.yaml` (the
single place a new capability enters the agent layer) and one `room.yaml` per
domain, sitting beside that tier's `.md` prose. The per-workflow allow-list is
**not** a separate budget file — it is the `tools`/`okf_rooms` of the workflow's
own `agent.yaml` (ADR-0088, `icm/agent.schema.json`).

### 2. Shape of the two files

Both files are the same minimal YAML shape — two string allow-lists:

```yaml
tools:      [<tool-id>, ...]      # stable tool identifiers the backend loader maps
okf_rooms:  [<silver-entity>, ...] # each resolves to a docs/database/semantic-layer
                                   #   coverage-matrix row (ADR-0086)
```

- `tools` — the union of capabilities grantable at this tier. Names are stable
  references the backend loader maps to implementations; never values.
- `okf_rooms` — the union of silver entities readable at this tier; each name
  resolves to an OKF coverage-matrix row (ADR-0086).
- Both are flat string allow-lists (block or flow YAML sequences). No nested
  structure, no per-entry config, no secrets, no client PII — these files
  replicate to every agent machine (ADR-0060). Tool and room names are
  references, never values.

A domain `room.yaml` entry MUST itself appear in `CONSTITUTION.yaml` (the domain
narrows, never widens); the gate's `checkSubset` enforces this as defence in
depth.

### 3. Degradation semantics — absent budget ⇒ next-lower declared list

A budget file at any upper tier is **optional**. When a tier's budget is absent,
the gate does not fail and does not treat the tier as forbidding everything;
instead **that tier's bound is the next-lower declared list**, so an absent
allow-list can never be *widened past* (there is nothing above to widen against):

- **Absent `CONSTITUTION.yaml`** ⇒ the domain's `room.yaml` is the authoritative
  outer bound (the Constitution neither widens nor narrows).
- **Absent domain `room.yaml`** ⇒ the workflow's own `agent.yaml` list is its own
  bound — the subset check passes vacuously, but the manifest is still **fully
  shape-checked** against `icm/agent.schema.json`'s constraints.

This is the gate's documented rule (`resolveDomainBudget` / the `??`
fall-throughs in `main()`): `dTools = domain.tools ?? manifest.tools`,
`constitutionTools = cTools ?? dTools`. Its purpose is **ship order**: the schema,
the gate, and a workflow's `agent.yaml` can land before the domain tier's budget
files exist, and every manifest is still structurally validated and is never
permitted to widen above a declared tier. Adding a budget file later only ever
*tightens*, never loosens — so the degradation is safe-by-construction (an
absent budget is the most permissive case, and the explicit budget that replaces
it can only remove entries).

### 4. Structure (schema) vs invariant (gate) — two complementary contracts

- `icm/agent.schema.json` is the **per-manifest STRUCTURE** contract: it
  validates a *single* `agent.yaml`'s shape (required keys, enums, the
  `system_compose` order, allow-list arrays, no inline `mcp_servers` secrets). It
  cannot, by design, express a relationship spanning three files.
- `scripts/agent-yaml-gate.mjs` enforces the **cross-tier INVARIANT**
  (`workflow ⊆ domain ⊆ Constitution`) by reading the budget files this ADR
  ratifies and reimplementing the schema's load-bearing structural checks (so CI
  needs no JSON-Schema runtime). Its pure functions are the **same** ones the
  backend loader imports (Backend #162) — one contract, no drift.

So: the schema governs *one file's structure*; the budget files + gate govern
*how the three tiers compose*. Both are required; neither subsumes the other. This
ADR ratifies the budget files (the second axis); ADR-0088 / `agent.schema.json`
own the first.

This ADR **extends ADR-0088 §3**: ADR-0088 ratified the subset *invariant* and the
`agent.yaml` manifest; this ADR ratifies the *budget files* the invariant is
checked against (their name, location, shape, and absent-tier degradation).

## Consequences

### Security impact

Formalizes the least-privilege enforcement substrate: the budget files are the
auditable, reviewed allow-lists that bound every ICM worker's tools and data
scope, and `CONSTITUTION.yaml` is now the explicit single chokepoint through which
any new capability must pass (a reviewed unit of work). Ratifying the names and
shape means a rename/relocate/reshape of a security-critical file now requires a
superseding ADR rather than a silent edit. The degradation rule is safe by
construction — an absent budget is the most permissive state and can only be
tightened by adding the file, never loosened. **No secrets, no client PII** in
these files (ADR-0060) — they are reference lists of tool and room *names* that
replicate to every agent machine; values never appear. `Never commit secrets`.

### Cost impact

None. The budget files are tiny static YAML read by the gate (CI) and the loader;
no runtime inference, storage, or service cost.

### Operational impact

No new runtime component — this ratifies artifacts and a rule the gate already
implements. Authoring guidance is unchanged and stays in
`docs/agents/agent-yaml-schema.md` (the how-to); this ADR is the why/decision it
now cites. Adding a domain creates one `room.yaml`; adding a capability edits
`CONSTITUTION.yaml` (a deliberate, reviewed change). The conformance gate
(`icm-conformance`, #702) already validates conformance and is unaffected by this
documentation-only ratification.

## Future considerations

- Budget-file linting could later assert that every `okf_rooms` entry resolves to
  a live OKF coverage-matrix row (ADR-0086) and every `tools` entry to a
  loader-known identifier — closing the gap between "named in a budget" and
  "actually implemented."
- If a tier ever needs per-entry config (e.g. a tool with scoped parameters), the
  flat-string shape ratified here would need a superseding ADR — it is
  deliberately minimal so that change is a visible decision.
- The same budget-file pattern is the swappable seam for the coding/build plane
  (ADR-0088 future considerations): a coding-domain `room.yaml` would bound that
  plane's tools without re-authoring the convention.
