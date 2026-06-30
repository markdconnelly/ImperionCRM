---
type: Silver Table
title: stakeholder
entity: stakeholder
archetype: B
description: The per-account relationship/influence map on contacts — who is champion, economic buyer, technical decision-maker, influencer, user, or detractor, with influence, sentiment, and active-vs-departed status.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, customer-success, relationship, churn]
data_class: client_pii
timestamp: 2026-06-29T00:00:00Z
---

# stakeholder

The **relationship map** Celeste's client-success procedures were missing: for each client
(`account`), which **person** (`contact`) is the **champion**, the **economic_buyer**, the
**technical_decision_maker**, an **influencer**, a plain **user**, or a **detractor** — plus
their **influence**, **sentiment**, and **relationship_status** (active vs departed).
App-native silver (archetype B), born here; part of epic
[#1396](https://github.com/markdconnelly/ImperionCRM/issues/1396) (operator-readiness, issue
[#1695](https://github.com/markdconnelly/ImperionCRM/issues/1695)). A health verdict without
this map misses the single biggest leading churn signal there is: **the champion left**
(`role=champion` flips to `relationship_status=departed`).

## Source of record / authority

**Imperion app-native** for the stakeholder model. Two origins, both recorded in `source`:
**`derived`** (inferred from `interaction`/comms patterns) or **`curated`** (a human set it).
The source is **always recorded** so a downstream reader weighs measured signal vs inference —
a `detractor` is **never asserted without evidence** (the signal-vs-inference discipline,
celeste.md guardrail 3). A backend **stakeholder-mapping executor** maintains it (approval-gated,
server-side, **never a direct silver write**); read-only to web (render) and to agents (Celeste
reads it in the client-360 (08-A), QBR (08-C), health/churn (08-D), and reference targeting (the
advocacy seam, #1692)).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (`ON DELETE CASCADE`) — the client |
| `contact_id` | uuid | FK → `contact` (`ON DELETE CASCADE`) — the person |
| `role` | enum `stakeholder_role` | `champion` · `economic_buyer` · `technical_decision_maker` · `influencer` · `user` · `detractor` · `unknown` (default `unknown`) |
| `influence` | enum `stakeholder_influence` | `high` · `medium` · `low` · `unknown` (default `unknown`) |
| `sentiment` | enum `stakeholder_sentiment` | `positive` · `neutral` · `negative` · `unknown` (default `unknown`) |
| `relationship_status` | enum `stakeholder_relationship_status` | `active` · `departed` · `unknown` (default `active`) — the churn-signal axis |
| `source` | enum `stakeholder_source` | `derived` (inferred) · `curated` (human-set) — provenance for signal-vs-inference |
| `evidence_note` | text | provenance pointer (NOT pii: a basis note, e.g. 'N inbound approvals over 90d') |
| `as_of` | timestamptz | the as-of of this assessment |
| `departed_at` | timestamptz | set when `relationship_status` → `departed` (the churn-signal timestamp) |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**Constraint:** `stakeholder_account_contact_uniq` — `UNIQUE (account_id, contact_id)`: one
current stakeholder profile per person per account (history via `departed_at` + `as_of`).

## Joins

- `account_id` → `account` (the client); `contact_id` → `contact` (the person).
- Feeds the client-360 (08-A), QBR targeting (08-C), and champion-departure as a churn signal
  into health/churn (08-D); the advocacy seam (#1692) targets a `champion` for a reference.

## Notes

This entity **HOLDS `client_pii`** at runtime — a named person's role/influence/sentiment at a
named client. data_class is `client_pii` (**always-gate**). The model is signal-labeled by
`source`: never assert a `detractor` (or any role) without evidence — a `derived` assessment is
inference, a `curated` one is human-set. No PII values appear in this doc — resolve specific
values against the live read-only DB.
