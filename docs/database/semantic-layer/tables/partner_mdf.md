---
type: Silver Table
title: partner_mdf
entity: partner_mdf
archetype: B
description: App-native market-development fund (MDF) record — a partner's fund request → approved → spent → closed (with ROI). Money is a proposal/record; the actual movement is QBO's, gated. Bridget drafts, a human approves.
resource: ../../../decision-records/ADR-0133-operating-procedure-catalog.md
tags: [silver, partnerships, mdf, money, archetype-b, app-native]
data_class: financial
timestamp: 2026-06-29T00:00:00Z
---

# partner_mdf

The app-native **market-development fund (MDF)** record: a [`partner`](partner.md)'s fund
`requested → approved → spent → closed` (with an ROI write-up). **Bridget** (Partnerships,
#1624) drafts the request and the spend proposal; a human (**Sterling/Audrey**) approves — every
money actuation is `always_gate` (ADR-0136 A2 money class / B6 money-gate). The amount here is a
**proposal/record**: the actual money movement is QBO's (ADR-0044/finance), gated — this table
never moves money. The money half of the partner model (the [`partner`](partner.md) spine is 0226).

## Source of record / authority

**App-native — the website is the system of record** for the MDF request/approval/ROI lifecycle
(`partner:write`, ADR-0045). The **actual disbursement is QBO's** (finance SoR); this row mirrors
the program decision, it does not own the cash movement. Backend-executed (Bridget proposes, a
human approves, finance actuates); read-only to web for render. `data_class: financial` — always-gate.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `partner_id` | uuid | FK → `partner` (ON DELETE CASCADE) |
| `amount` | numeric(14,2) | requested/approved fund amount; CHECK `>= 0` (a proposal, not a cash move) |
| `status` | `partner_mdf_status` enum | `requested` · `approved` · `spent` · `closed` |
| `purpose` | text | what the fund is for (campaign/event/enablement) |
| `period` | text | program period band (e.g. `FY26-Q3`) |
| `roi_note` | text | ROI write-up, populated on close |
| `requested_at` | timestamptz | |
| `approved_at` | timestamptz | set on `approved` (the gated step) |
| `created_at` / `updated_at` | timestamptz | `set_updated_at` trigger |

Indexed on `partner_id`, `status`.

## Joins

- `partner_id` → `partner` — the partner the fund belongs to.
- **Acting workflow:** Bridget's MDF procedure (Stream-02 channel set) drafts the request + spend
  proposal; the approval + spend are human-gated (Sterling/Audrey).

## Notes

PII: none / financial. Amounts + status + period + a partner FK — no personal data. **Money is
always-gate** (no autonomous approval/spend at any dial; ADR-0136 A2/B6). No secrets.
