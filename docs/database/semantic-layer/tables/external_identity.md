---
type: Reference Table
title: external_identity
entity: external_identity
archetype: H
description: Per-provider identity link — maps one internal account or contact to its id in an external system; the CRM-side feed into the identity spine.
resource: ../../../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md
tags: [silver, identity, external_identity, reference]
data_class: operational
timestamp: 2026-06-23T00:00:00Z
---

# external_identity

The **provider-side identity link** for a known CRM subject: "this `account` (or
`contact`) is `external_id` in provider X." Written by the connector sync when it observes
a provider id for an already-resolved account/contact, so later syncs and agents can map
a provider record back to the internal entity without re-matching. Governed by
[ADR-0024](../../../decision-records/ADR-0024-per-user-personal-connections-and-lead-hooks.md)
(per-user connections); the broad cross-source resolver is
[`entity_xref`](entity_xref.md) — see Joins.

## Source of record / authority

**App-native; no external SoR.** A row is the assertion "internal entity ↔ provider id",
written by the connector for the `provider`. One subject column is set per row
(`account_id` **or** `contact_id`), keyed by `(subject, provider, external_id)`. It holds
**no secret** — the provider's token/credential lives in [`connection`](connection.md) /
Key Vault by reference (ADR-0024), never here; `metadata` is non-sensitive routing
context only.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (ON DELETE CASCADE); set when the subject is a company |
| `contact_id` | uuid | FK → `contact` (ON DELETE CASCADE); set when the subject is a person |
| `provider` | enum `connection_provider` | the external system — `m365` · `google` · `youtube` · `linkedin` · `facebook` · `plaud` · `autotask` · `itglue` (+ later `acs` · `apollo` · `darkwebid` · `docusign` · `gdap` · `meta` · `myitprocess` · `pax8` · `qbo` · `quotemanager` · `televy` · `unifi`); the same provider set `connection` uses |
| `external_id` | text | the subject's id in that provider |
| `metadata` | jsonb | non-sensitive routing/context (no secrets) |
| `created_at` / `updated_at` | timestamptz | |

## Joins

- `account_id` → `account`; `contact_id` → `contact` (exactly one is set per row).
- `provider` → the `connection_provider` enum, i.e. the source registry behind
  [`connection`](connection.md) (the OKF source→skill hop resolves through there, ADR-0104).
- **vs [`entity_xref`](entity_xref.md):** `entity_xref` is the general identity spine
  (any source id → one internal entity, across all entity types) that agents resolve
  before acting; `external_identity` is the narrower, CRM-scoped account/contact↔provider
  link. Treat `entity_xref` as authoritative where both describe the same mapping. These rows are
  **backfilled into `entity_xref`** as `deterministic` links (migration 0190, #1111) — provider →
  `source_system`, the set subject column → `entity_type` — so the spine adopts them as a seed
  while a curated `manual` spine link still wins.

## Notes

`external_id` / `metadata` can be personal data when the subject is a `contact`. PII-free
here by design (definitions, not values); resolve specific ids against the live read-only
DB (CLAUDE.md §8), never inline row-level values.
