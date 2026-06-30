---
type: Silver Table
title: it_budget
entity: it_budget
archetype: B
description: Celeste's per-client vCIO IT budget / forecast — one line per account × period × category × scenario with a planned + forecast amount; the persisted store behind 08-H.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, customer-success, vcio, budget, advisory]
data_class: client_pii
timestamp: 2026-06-29T00:00:00Z
---

# it_budget

Celeste's persisted **per-client vCIO IT budget / forecast**: one line per `account` ×
`period_start` × `category` × `scenario` carrying a `planned_amount` and a forward
`forecast_amount`. App-native silver (archetype B), born here; part of epic
[#1396](https://github.com/markdconnelly/ImperionCRM/issues/1396) (operator-readiness,
issue [#1688](https://github.com/markdconnelly/ImperionCRM/issues/1688)). It is the
**persistence store** behind 08-H `it-budget-planning`, which previously evaporated after the
run — a vCIO budget must persist, version, and be referenced across QBRs.

**Not the Finance `budget`** ([#1718](https://github.com/markdconnelly/ImperionCRM/issues/1718)):
that is Imperion's **own** company operating plan (FP&A, `financial`, Audrey). `it_budget` is a
per-**client** advisory Celeste produces as vCIO — distinct subject, distinct owner.

## Source of record / authority

**Imperion app-native** for the client IT budget. Celeste's 08-H **proposes** the lines (a
parked recommendation — **NO-COMMITS**, spend is never committed, celeste.md guardrail 1); a
backend **it-budget persist executor** writes them (approval-gated, server-side, **never a
direct silver write**). Cost figures arrive as an **Audrey (Finance) read-only handoff** —
Celeste reads no Imperion financials directly. `source` records the provenance of each figure
(`roadmap` / `audrey_handoff` / `curated`). Read-only to web (render) and to agents.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (`ON DELETE CASCADE`) — the client |
| `period_start` | date | the budget period start |
| `period_end` | date | nullable |
| `category` | enum `it_budget_category` | `hardware` · `software` · `licensing` · `managed_services` · `professional_services` · `security` · `connectivity` · `cloud` · `contingency` · `other` |
| `scenario` | enum `it_budget_scenario` | `base` · `conservative` · `aggressive` (default `base`) |
| `line_item` | text | short description (NOT pii): 'firewall refresh', 'M365 E5 true-up' |
| `planned_amount` | numeric(14,2) | the planned spend (default 0) |
| `forecast_amount` | numeric(14,2) | the forward forecast (nullable) |
| `currency` | text | default `USD` |
| `status` | enum `it_budget_status` | `draft` · `proposed` · `approved` · `superseded` (advisory baseline — `approved` ≠ a spend commitment) |
| `source` | enum `it_budget_source` | `roadmap` · `audrey_handoff` · `curated` |
| `as_of` | timestamptz | the as-of of the figure |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**Constraint:** `it_budget_line_uniq` — `UNIQUE (account_id, period_start, category, scenario)`:
one line per cell (the upsert key; revisions via `as_of` + `status`).

## Joins

- `account_id` → `account` (the client). Grounded by the client's strategic roadmap (the vCIO
  roadmap document, 08-G) and Audrey's cost-to-serve handoff (Finance). Feeds the QBR (08-C).

## Notes

This entity **HOLDS `client_pii`** at runtime — per-client advisory spend figures. data_class is
`client_pii` (**always-gate**). `approved` is an advisory baseline, **never a spend commitment**
(NO-COMMITS-EVER, dial-proof). No PII values appear in this doc — resolve specifics against the
live read-only DB.
