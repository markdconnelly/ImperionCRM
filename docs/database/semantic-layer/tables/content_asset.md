---
type: Silver Table
title: content_asset
entity: content_asset
archetype: B
description: The single typed home for Belle's authored marketing artifacts — content, sales-enablement, and PR-authoring in one entity, differing by type/audience; publish is a handoff to Loveable.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, marketing, content, demand-gen]
data_class: operational
timestamp: 2026-06-29T00:00:00Z
---

# content_asset

The single typed substrate for Belle's authored marketing artifacts (epic #1696, decisions
D2/D3). **Content + sales-enablement + PR-authoring live in ONE entity**, differing only by
`type` and `audience`: a `blog` / `case_study` / `whitepaper` for prospects, a `battlecard` /
`one_pager` for sellers, a `press_release` / `announcement` for press. The authored draft is
`body`; **publish is a HANDOFF to Loveable** — the rendered external URL is stored in
`publish_ref` — **not a send**. Born silver (app-native, archetype B); there is no bronze
source — Belle authors in-app, approval-gated at the content-studio review-gate.

## Source of record / authority

**Imperion app-native system of record.** Belle's `content.write` executor authors and updates
the asset server-side, approval-gated (never a direct silver write). `publish_ref` links the
**Loveable-rendered** external URL, but **Imperion owns the asset itself and its attribution
lineage** (D3) — Loveable only renders the published artifact. The `brand_compliance_note` +
`brand_checked_at` are stamped at the review-gate against `brand_asset` (read-only, D5);
Imperion never writes brand state.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `type` | enum `content_asset_type` | `blog` · `case_study` · `whitepaper` · `battlecard` · `one_pager` · `press_release` · `announcement` |
| `audience` | enum `content_asset_audience` | `prospect` · `seller` · `press` (default `prospect`) |
| `status` | enum `content_asset_status` | `draft` · `in_review` · `approved` · `published` · `archived` (default `draft`) |
| `title` | text | NOT NULL |
| `body` | text | the authored draft (nullable) |
| `publish_ref` | text | external Loveable URL where it was rendered; null until publish-handoff (D3) |
| `campaign_id` | uuid | FK → `campaign` (ON DELETE SET NULL) — attribution asset→campaign→lead→won (#1316) |
| `brand_compliance_note` | text | stamped at the content-studio review-gate; references `brand_asset` (read-only, D5) |
| `brand_checked_at` | timestamptz | |
| `created_by_user_id` | uuid | FK → `app_user` |
| `created_at` / `updated_at` | timestamptz | `updated_at` maintained by `set_updated_at` trigger |
| `backed_by_reference_id` | uuid | **Added by migration 0236** (FK → `reference`) — the reference migration owns the bidirectional link, to avoid a circular FK; not present in 0235 |

## Joins

- `campaign_id` → `campaign` for demand-gen attribution (asset→campaign→lead→won, #1316).
- `backed_by_reference_id` → `reference` (added by 0236) — a `case_study` is backed by the
  consent-gated client proof in `reference`.
- `created_by_user_id` → `app_user`.
- Brand compliance is a **read-only reference** to `brand_asset` (a stamped note, never an FK
  write).

## Notes

PII-free — no client identifiers live in the asset beyond the standard refs above. A
`case_study`'s client proof (named logos, quotes, results) lives in the **consent-gated
`reference`**, not here. Publish never moves data outward as a send — it records the
Loveable-rendered URL; resolve any volatile/specific values against the live read-only DB.
