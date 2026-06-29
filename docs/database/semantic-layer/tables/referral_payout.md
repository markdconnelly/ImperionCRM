---
type: Silver Table
title: referral_payout
entity: referral_payout
archetype: B
description: App-native referral-partner payout record — pending → approved → paid for a referral a partner sourced, linked to the earning co-sell/referral registration. Money is a proposal/record; the actual payout is gated finance.
resource: ../../../decision-records/ADR-0133-operating-procedure-catalog.md
tags: [silver, partnerships, referral, payout, money, archetype-b, app-native]
data_class: financial
timestamp: 2026-06-29T00:00:00Z
---

# referral_payout

The app-native **referral-partner payout** record: `pending → approved → paid` for a referral a
[`partner`](partner.md) sourced, linked to the earning [`partner_deal`](partner_deal.md)
registration. **Bridget** (Partnerships, #1624) drafts the payout proposal as part of the
referral-partner program (Stream-02 **02-D2**); a human (**Sterling/Audrey**) approves and the
`approved → paid` actuation is **gated finance** — `always_gate` (ADR-0136 A2 money class / B6).
The amount is a **proposal/record**: the actual payout is QBO's (ADR-0044/finance), gated — this
table never moves money.

## Source of record / authority

**App-native — the website is the system of record** for the payout register
(`partner:write`, ADR-0045). The **actual disbursement is QBO's** (finance SoR); this row mirrors
the program decision. Backend-executed (Bridget proposes, a human approves, finance actuates);
read-only to web for render. `data_class: financial` — always-gate.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `partner_id` | uuid | FK → `partner` (ON DELETE CASCADE) |
| `partner_deal_id` | uuid | FK → `partner_deal` (the earning registration; nullable; ON DELETE SET NULL) |
| `amount` | numeric(14,2) | payout amount; CHECK `>= 0` (a proposal, not a cash move) |
| `status` | `referral_payout_status` enum | `pending` · `approved` · `paid` · `rejected` |
| `period` | text | payout period band |
| `note` | text | |
| `created_at` | timestamptz | |
| `approved_at` | timestamptz | set on `approved` (gated) |
| `paid_at` | timestamptz | set on `paid` (gated finance actuation) |
| `updated_at` | timestamptz | `set_updated_at` trigger |

Indexed on `partner_id`, `partner_deal_id`, `status`.

## Joins

- `partner_id` → `partner` — the partner being paid.
- `partner_deal_id` → `partner_deal` — the co-sell/referral registration that earned the payout
  (the attribution link; nullable).
- **Acting workflow:** Bridget's referral-partner program procedure (02-D2) drafts the payout; the
  approval + payout are human-gated (Sterling/Audrey).

## Notes

PII: none / financial. Amounts + status + period + partner/deal FKs — no personal data. **Money is
always-gate** (no autonomous approval/payout at any dial; ADR-0136 A2/B6). No secrets.
