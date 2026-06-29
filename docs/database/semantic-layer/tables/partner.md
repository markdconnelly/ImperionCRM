---
type: Silver Table
title: partner
entity: partner
archetype: B
description: App-native channel/alliance partner — an organization Imperion sells THROUGH or co-sells WITH (distributor, vendor alliance, referral partner), driven prospect→active→inactive, carrying a program + tier band. The SELL-side twin of buy-side procurement (Pax8 is both).
resource: ../../../decision-records/ADR-0133-operating-procedure-catalog.md
tags: [silver, partnerships, channel, alliance, co-sell, archetype-b, app-native]
data_class: operational
timestamp: 2026-06-29T00:00:00Z
---

# partner

The app-native **channel/alliance partner** record: an organization Imperion sells *through*
or co-sells *with* — a distributor (e.g. Pax8), a vendor alliance, or a referral partner.
**Bridget** (Partnerships, #1624, under Sterling / Deputy CFO) opens a partner, drives it
`prospect → active → inactive`, and tracks its `program` + `tier` band. It is the **SELL-side**
twin of Vance's **BUY-side** procurement: Pax8 is *both* a vendor Vance procures from and a
channel Bridget sells through — the two split at the Bridget↔Vance seam (ADR-0133 catalog,
ADR-0136 A11 obligation/action separation). Until this entity is prod-applied, Bridget's
Stream-02 channel procedures (02-D) are procedure-only / dormant (ADR-0136 A5c).

## Source of record / authority

**App-native — the website is the system of record** for the partnership relationship
(`partner:write`, ADR-0045). A partner is NOT a bronze→silver merge: no external system owns
Imperion's partner relationships. `external_ref` holds the opaque partner/marketplace id (e.g.
Pax8 partner id) for reconciliation — a reference, **never a credential** (ADR-0060).
Backend-executed (Bridget's procedures, ≤ L3 — she never binds a partner agreement or commits
terms; A11 / build spec); read-only to web for render.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | partner organization name |
| `program` | text | program band (e.g. `pax8-marketplace`, `microsoft-csp`, `vendor-alliance`) — text, not enum |
| `tier` | text | tier/certification band (e.g. `gold` · `silver` · `registered`) — gates partner-tier benefits |
| `status` | `partner_status` enum | `prospect` · `active` · `inactive` |
| `external_ref` | text | opaque external/marketplace partner id for reconciliation — never a secret (nullable) |
| `account_id` | uuid | FK → `account` (nullable — a partner may also be a managed client; ON DELETE SET NULL) |
| `notes` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | `set_updated_at` trigger |

Indexed on `status`, `account_id`, `name`.

## Joins

- `account_id` → `account` — the owning client when a partner is also a managed account
  (nullable; the dogfood/subject parameter, ADR-0133 D7).
- `partner_deal.partner_id` → `partner` — the co-sell/referral registrations this partner holds.
- **Acting workflow:** Bridget's `partner-deal-routing` tracer reads `partner` (+ `partner_deal`)
  to resolve the partner and stamp attribution; the Stream-02 channel procedures (02-D) manage
  the partner, track tier, and adjudicate channel conflict.

## Notes

PII: none / operational. A partner is an organization name + program/tier bands + an opaque
external ref — it mints no personal data of its own. **Deferred to a follow-on slice:** MDF
(market-development funds) + `referral_payout` — those are financial (money, always-gate, B6)
and their procedures are dormant regardless; modeled later without reshaping this table. No
secrets (`external_ref` is an id, never a credential).
