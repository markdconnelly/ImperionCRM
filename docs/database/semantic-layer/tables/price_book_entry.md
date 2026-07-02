---
type: Silver Table
title: price_book_entry
entity: price_book_entry
archetype: B
description: App-native versioned price-book / rate-card line — one row per sku × version carrying list price, cost basis, and the ratified margin floor. Sterling drafts/proposes; publishing a floor is always_gate (a human ratifies); the published standard is what repricing and the deal desk read.
resource: ../../../decision-records/ADR-0136-workflow-doctrine.md
tags: [silver, sales, gtm-governance, price-book, rate-card, money, archetype-b, app-native]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# price_book_entry

The app-native **versioned price-book / rate-card line**: one row per `sku` × `version`
carrying the **list price**, the **cost basis**, and the ratified **margin floor** for a
SKU/service. Substrate for **Sterling's** OP-02-C1 (govern the price book & rate-card,
Stream 02 GTM governance — [#1652](https://github.com/markdconnelly/ImperionCRM/issues/1652),
epic [#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534)). Sterling (L2
delegate-only) grounds + assembles a rate-card change and **parks** it; **publishing** a
floor is `always_gate` (ADR-0136 A2 class-1/6 — a standing money/term commitment; a human,
Nick/Mark, ratifies and is audited in `published_by`). The **published** rows are THE
standard that 02-A7 repricing and the 02-C2 deal desk read; a publish supersedes the prior
version, so the table is its own audit trail. Pairs with
[`discount_tier`](discount_tier.md) (same migration, same lifecycle).

**Not the gutted CPQ price book** (ADR-0067, superseded in part by ADR-0080/0096): that was
a quote-*engine* catalog, and **KQM remains the read-only quote SoR**. This is the
**governance standard above the deal** — no quote objects, no quote engine.

## Source of record / authority

**App-native — the website is the system of record** for the rate-card standard. Sterling's
02-C1 drafts/proposes rows (backend-executed, server-side — never a direct silver write); a
human publishes (`always_gate`, `published_by` audited); on publish the prior version flips
to `superseded`. Cost basis arrives from Vance's cost-pass-through (02-B7) and Audrey's
margin grounding (advise-only). Read-only to web (render) and to consuming agents (Chase
02-A3/A7, the 02-C2 deal desk, Vance catalog refs). `data_class: financial` — always-gate.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `sku` | text | the SKU / service code (e.g. `MSP-SEAT-STD`) |
| `name` | text | human name: 'Managed seat — standard' |
| `kind` | `price_book_item_kind` enum | `service` · `product` · `license` · `bundle` · `other` |
| `unit` | text | pricing unit: 'per user/month', 'per device/month', 'per hour', 'one-time' |
| `list_price` | numeric(14,2) | published list price per unit; CHECK `>= 0` |
| `unit_cost` | numeric(14,2) | cost basis (Vance 02-B7 pass-through feeds this); nullable |
| `margin_floor_pct` | numeric(5,2) | the ratified minimum margin % — a breach routes to the 02-C2 deal desk; CHECK 0–100 |
| `currency` | text | default `USD` |
| `version` | integer | rate-card version of this line (publish = new version; prior → `superseded`) |
| `status` | `price_book_status` enum | `draft` · `proposed` · `published` · `superseded` · `rejected` |
| `effective_from` / `effective_to` | date | when the published line applies |
| `published_at` | timestamptz | set on `published` (the always_gate actuation) |
| `published_by` | text | the ratifying human (audit — Sterling never self-publishes) |
| `note` | text | the grounded why (cost shift, margin-at-risk), cited |
| `created_at` / `updated_at` | timestamptz | `set_updated_at` trigger |

**Constraint:** `price_book_entry_sku_version_uniq` — `UNIQUE (sku, version)`: one line per
SKU per rate-card version. Indexed on `sku`, `status`.

## Joins

- No FK: the SKU is app-native vocabulary (the gutted CPQ `product` table does not exist;
  KQM quote lines reference it by code, read-only).
- [`discount_tier`](discount_tier.md) — the approval-threshold half of the same rate card
  (shared `price_book_status` lifecycle, versions together).
- **Acting workflow:** OP-02-C1 (Sterling) governs it; 02-A7 repricing and the 02-C2 deal
  desk read the `published` rows as the standard; Vance (02-B7) supplies the cost basis.

## Notes

PII: none / financial. SKUs + prices + floors — commercial standards, no personal data.
**Publishing a floor is always-gate** (no autonomous publish at any dial; ADR-0136 A2/A10
row 4). Propose-only/dormant until the migration is prod-applied (ADR-0136 A5c). No secrets.
