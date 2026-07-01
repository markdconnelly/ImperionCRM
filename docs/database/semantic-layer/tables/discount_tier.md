---
type: Silver Table
title: discount_tier
entity: discount_tier
archetype: B
description: App-native versioned discount tier / approval threshold — one row per tier_code × version stating the deepest discount + longest term a band permits and who must approve a deal landing in it. Feeds the OP-02-C2 deal desk; publishing a tier is always_gate.
resource: ../../../decision-records/ADR-0136-workflow-doctrine.md
tags: [silver, sales, gtm-governance, discount, deal-desk, money, archetype-b, app-native]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# discount_tier

The app-native **versioned discount tier / approval threshold**: one row per `tier_code` ×
`version` stating the **deepest discount** (`max_discount_pct`) and **longest term**
(`max_term_months`) a band permits, and the **approval route** a deal landing in that band
must take (`none` / `deal_desk` / `executive`). The threshold half of the rate card
([#1652](https://github.com/markdconnelly/ImperionCRM/issues/1652), epic
[#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534), OP-02-C1) — it **feeds
the OP-02-C2 deal desk**: a Chase-owned deal whose discount depth or term breaches the
published tier routes to Sterling's parked deal-desk packet, where the approval is the
human's. Pairs with [`price_book_entry`](price_book_entry.md) (same migration, shared
`price_book_status` lifecycle, versions with the rate card).

## Source of record / authority

**App-native — the website is the system of record** for the discount-tier standard.
Sterling's 02-C1 drafts/proposes tiers (backend-executed, server-side — never a direct
silver write); a human publishes (`always_gate`, ADR-0136 A2 — `published_by` audited); on
publish the prior version flips to `superseded`. Read-only to web (render) and to consuming
agents (Chase 02-A5/A7 quoting, the 02-C2 deal-desk breach detection).
`data_class: financial` — always-gate.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `tier_code` | text | e.g. `T0-STANDARD`, `T1-MANAGER`, `T2-DEAL-DESK` |
| `name` | text | human name: 'Within standard terms' |
| `max_discount_pct` | numeric(5,2) | the deepest discount this tier permits; CHECK 0–100 |
| `max_term_months` | integer | the longest term this tier permits (NULL = no term ceiling); term breaches also route (02-C2); CHECK `> 0` |
| `approval_route` | `discount_approval_route` enum | `none` (within standard) · `deal_desk` (02-C2 clock) · `executive` (Nick/Mark) |
| `version` | integer | versions with the rate card (publish = new version; prior → `superseded`) |
| `status` | `price_book_status` enum | `draft` · `proposed` · `published` · `superseded` · `rejected` (shared with `price_book_entry`) |
| `effective_from` / `effective_to` | date | when the published tier applies |
| `published_at` | timestamptz | set on `published` (the always_gate actuation) |
| `published_by` | text | the ratifying human (audit) |
| `note` | text | |
| `created_at` / `updated_at` | timestamptz | `set_updated_at` trigger |

**Constraint:** `discount_tier_code_version_uniq` — `UNIQUE (tier_code, version)`: one band
per rate-card version. Indexed on `tier_code`, `status`.

## Joins

- [`price_book_entry`](price_book_entry.md) — the price/floor half of the same rate card
  (no FK; they version together under 02-C1's publish gate).
- **Acting workflow:** OP-02-C1 (Sterling) governs the tiers; OP-02-C2 (deal desk) reads
  the `published` tiers to detect a breach and route the approval; Chase's 02-A5/A7 quote
  proceeds against a granted exception.

## Notes

PII: none / financial. Tier codes + percentages + routes — commercial standards, no personal
data. **Publishing a tier is always-gate** (a standing money/term commitment; ADR-0136 A2 —
no autonomous publish at any dial). Propose-only/dormant until the migration is prod-applied
(ADR-0136 A5c). No secrets.
