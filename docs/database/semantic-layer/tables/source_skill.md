---
type: Reference Table
title: source_skill
entity: source_skill
archetype: H
description: Per-source (provider) sanctioned fetch/validate skill map — the tool-routing hop the OKF layer points at; one row per provider, skills referenced by name only.
resource: ../../../decision-records/ADR-0104-okf-orchestrator-grounding-cortex.md
tags: [reference, config, tool-routing, registry, skills]
timestamp: 2026-06-19T00:00:00Z
---

# source_skill

The **source→sanctioned-skill registry**: one row per provider naming the skill blessed to
**fetch** and to **validate** data from that source. This is the tool-routing hop the OKF
layer *points at* but does not contain — OKF grounds on an entity's meaning and lists its
sources; the orchestrator resolves *entity → its sources → this registry → the sanctioned
skill*, then checks [`agent_tool_grant`](agent_tool_grant.md) before invoking. Governed by
[ADR-0104](../../../decision-records/ADR-0104-okf-orchestrator-grounding-cortex.md)
(decision 2), extending the [`connection`](connection.md) registry
([ADR-0103](../../../decision-records/ADR-0103-connection-credential-registry.md)); migration
0143.

## Source of record / authority

**The website is the system of record** (admin-managed config; no external merge). The map
is **source-scoped, once** — keyed by `provider` (mirroring `connection.provider`), **not**
per-entity, so the same Autotask fetch skill serves every Autotask-sourced entity without
duplication (the anti-pattern ADR-0104 decision 2 rejects). **Skills are referenced by name
only** (`imperion-skills:<name>`, ADR-0060) — they live in the in-repo plugin marketplace,
never the DB; a name here is a pointer, not code. The table ships **empty**; rows are seeded
as the sanctioned skills are authored. A NULL `fetch_skill`/`validate_skill` means "none
sanctioned yet" — the orchestrator has no blessed skill to route to and defers to a human.

## Schema

| Column | Type | Notes |
|---|---|---|
| `provider` | enum `connection_provider` | PK — mirrors `connection.provider` (e.g. `autotask` · `m365` · `itglue` · `apollo` · `qbo` · `meta` · …) |
| `fetch_skill` | text | sanctioned ingest/fetch skill name (`imperion-skills:<name>`); NULL = none yet |
| `validate_skill` | text | sanctioned validate skill name; NULL = none |
| `notes` | text | free-text context |
| `updated_at` | timestamptz | `set_updated_at` trigger |

## Joins

- `provider` mirrors [`connection`](connection.md)`.provider` (same enum) — the two together
  are the source registry: `connection` holds per-instance custody (KV secret ref, scope,
  cadence), `source_skill` holds the per-provider sanctioned skill.
- **Consumed by** the orchestrator/ICM at tool-selection time, gated by
  [`agent_tool_grant`](agent_tool_grant.md) (the per-agent allow-list).

## Notes

No PII, no secrets — skill **names** only (tokens stay Key-Vault-by-reference on
`connection`, ADR-0103). Resolve the current map against the live read-only DB.
