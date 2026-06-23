---
type: Silver Table
title: lead_score
entity: lead_score
archetype: C
description: A rule-based (and later predicted) lead score per contact — fit + weighted engagement → 0..100 with an explainable breakdown. A shared signal for routing, journeys, and forecasting. Website system of record (backend/LP scoring pass).
resource: ../../../decision-records/ADR-0073-marketing-automation-journeys.md
tags: [silver, marketing, lead, scoring, routing]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# lead_score

A **rule-based** lead score per [`contact`](contact.md) (ADR-0073 decision 5, #401):
fit attributes (who the contact is) + weighted engagement (what they have done) →
a 0..100 `score` with an **explainable** `breakdown`. It is the single shared signal
of how hot a contact is — read by routing (ADR-0024), marketing journeys (ADR-0073),
and forecasting (#316). Migration `0116`.

Born silver — a **derived** signal (a roll-up of `contact` fit fields + the
[`interaction`](interaction.md) engagement timeline), like
[`forecast_snapshot`](forecast_snapshot.md) is a derived snapshot. One **current** row
per `(contact, kind)`.

## Source of record / authority

**Website system of record, written by a process.** The backend / local-pipeline
scoring pass (ADR-0042 — a *process*, not the front end) computes the rule from the
contact's fit fields and engagement timeline and UPSERTs the row; the front end
**reads** it. The rule weights live in the app (`lib/lead-score.ts`,
`computeRuleLeadScore`) so the score is deterministic and tunable — the backend reuses
the same weights it persists. Idempotent per `(contact_id, kind)` via a UNIQUE
constraint: re-scoring UPDATEs in place rather than appending history.

`kind` distinguishes the regime: **rule** (deterministic, shipped) and **predicted**
(an LP model over engagement history, #402) **coexist** — predicted never silently
replaces rule.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `contact_id` | uuid | FK → `contact` (ON DELETE CASCADE) |
| `kind` | text | `rule` \| `predicted`; CHECK; default `rule` |
| `score` | numeric | resolved 0..100 (CHECK); the band cold/warm/hot is derived in the app, not stored |
| `breakdown` | jsonb | per-rule contributions summing to the score (fit + engagement, each label/points/group) — the explainable trace |
| `computed_at` | timestamptz | when last (re)computed |
| `created_at` | timestamptz | first seen |

UNIQUE `(contact_id, kind)` — one current score per contact per regime.

## Joins

- `contact_id` → [`contact`](contact.md): the scored lead; the 360 / Leads list reads
  the contact's current score, and routing ranks contacts by `score DESC` within a
  `kind`.
- The score is computed FROM [`interaction`](interaction.md) (engagement) +
  `contact` fit fields, but holds no FK to interaction — it is a roll-up, not a link.

## Notes

A derived signal — no new client PII (contact identity stays on `contact`; the score
references it by id). The `breakdown` is internal scoring metadata, not personal data.
Per-contact scores resolve against the live read-only DB. Bounded growth (one row per
contact per kind).
