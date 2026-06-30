---
type: Silver Table
title: brand_asset
entity: brand_asset
archetype: B
description: Human-owned, agent-read-only governing brand registry — logos, imagery/templates, color/type tokens, messaging pillars, approved boilerplate, do/don't rules; versioned and point-in-time auditable.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, marketing, brand, governance]
data_class: operational
timestamp: 2026-06-29T00:00:00Z
---

# brand_asset

The human-owned **governing brand registry**: the single source of truth for the brand —
logos, imagery/templates, color/type tokens, messaging pillars, approved boilerplate, and
do/don't rules. App-native silver (archetype B), curated by humans, versioned and
point-in-time auditable. Part of epic #1696 (decision D5); framed by the
[data-and-automation doctrine](../../architecture/data-and-automation-doctrine.md).

## Source of record / authority

**Human-owned and human-populated.** This table is **AGENT READ-ONLY** — it is referenced
by agents, **never written by any agent** (decision D5). There is no agent write path and no
autonomous-action kind, ever; the read-only invariant is enforced at the grant layer (every
role, including the backend/agent runtime, has `SELECT` only). The only write path is a future
human populate surface (admin GUI / seed), a follow-up per #1699, deliberately not yet granted.

Versioned via `version`, with `effective_from` / `effective_to` giving point-in-time audit
(`effective_to IS NULL` = currently effective).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `kind` | enum `brand_asset_kind` | `logo` · `imagery` · `template` · `color_token` · `type_token` · `messaging_pillar` · `boilerplate` · `rule` |
| `name` | text | |
| `content` | text | the textual asset — rule text / token value / messaging pillar / boilerplate copy |
| `asset_ref` | text | external pointer (DAM/SharePoint URL) to a binary asset; **no blob in DB** |
| `version` | int | default 1 |
| `effective_from` | date | |
| `effective_to` | date | null = currently effective (point-in-time auditable) |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | `updated_at` maintained by trigger |

## Joins

No FKs out — a standalone governing registry. Referenced **read-only** by content-studio's
review-gate for brand compliance and by Vera's marketing-conformance audit. The existing
`brand-voice.md` runtime skill is the prose companion and points here as the system of truth.

## Notes

No PII (brand governance, not personal). No binary in the DB — `asset_ref` points to the DAM.
The agent-read-only invariant (D5) is enforced at the grant layer: the backend/agent runtime
role has `SELECT` only — there is no agent or app write path in this migration.
