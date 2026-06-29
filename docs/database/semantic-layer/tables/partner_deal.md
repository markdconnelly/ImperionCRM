---
type: Silver Table
title: partner_deal
entity: partner_deal
archetype: B
description: App-native co-sell / referral registration linking a partner to an account + opportunity and stamping attribution — the record behind partner-sourced pipeline attribution (the Bridget→Chase seam) and channel-conflict adjudication.
resource: ../../../decision-records/ADR-0133-operating-procedure-catalog.md
tags: [silver, partnerships, co-sell, referral, attribution, channel-conflict, archetype-b, app-native]
data_class: operational
timestamp: 2026-06-29T00:00:00Z
---

# partner_deal

The app-native **co-sell / referral registration**: it links a [`partner`](partner.md) to an
[`account`](account.md) and (once opened) an [`opportunity`](opportunity.md), and stamps **how
the partner sourced or influenced** the deal. This is the record that lets **Bridget** attribute
**partner-sourced pipeline** and hand the close to **Chase** with attribution intact (the
Bridget→Chase seam), and that powers **channel-conflict adjudication** — the set of deals
registered against one account is the collision axis for a registered-deal conflict (02-D).

## Source of record / authority

**App-native — the website is the system of record** for the registration (`partner:write`,
ADR-0045). It **references** the opportunity and account; it does **not own** them — Chase owns
the opportunity (ADR-0044/sales), the kernel owns the account. Backend-executed (Bridget's
`partner-deal-routing` tracer, ≤ L3 — read + propose; she stamps attribution and parks the close
for Chase, never commits terms; A11 / build spec). Read-only to web for render.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `partner_id` | uuid | FK → `partner` (ON DELETE CASCADE) |
| `account_id` | uuid | FK → `account` (the co-sell/referral target; the channel-conflict collision axis; nullable; ON DELETE SET NULL) |
| `opportunity_id` | uuid | FK → `opportunity` (the Bridget→Chase close seam; Chase owns it; nullable until opened; ON DELETE SET NULL) |
| `deal_type` | `partner_deal_type` enum | `co_sell` · `referral` · `direct` |
| `registered_at` | timestamptz | first-to-register signal for channel conflict |
| `attribution` | text | how the partner sourced/influenced the deal — pipeline ROI input |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | `set_updated_at` trigger |

Indexed on `partner_id`, `account_id`, `opportunity_id`, `deal_type`.

## Joins

- `partner_id` → `partner` — the registering partner.
- `account_id` → `account` — the target client (the channel-conflict collision axis).
- `opportunity_id` → `opportunity` — the deal Chase closes; attribution is stamped here, not
  owned by the partner (the Bridget→Chase seam).
- **Acting workflow:** Bridget's `partner-deal-routing` tracer reads + writes `partner_deal`
  (resolve partner → classify co-sell/referral/direct → stamp attribution → hand to Chase);
  channel-conflict adjudication (02-D) reads the deals registered against an account.

## Notes

PII: none / operational. A `partner_deal` links existing records and stamps a free-text
attribution note — it mints no personal data of its own. No secrets. **Pool, never bleed**
(ADR-0136 A7): one partner's deals never cross into another's view (data_class / RLS).
