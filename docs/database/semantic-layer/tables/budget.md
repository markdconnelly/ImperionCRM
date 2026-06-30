---
type: Silver Table
title: budget
entity: budget
archetype: B
description: Human-authored, agent-read-only company operating plan — one row per account × period × category × scenario with a planned amount; the plan side that budget-variance and cash-flow-forecast tie actuals out against.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, finance, budget, fpna, plan]
data_class: financial
timestamp: 2026-06-29T00:00:00Z
---

# budget

The human-authored **company operating plan**: one row per `account` × `period_start` ×
`category` × `scenario` carrying a planned `amount`. This is the **plan side** of
plan-vs-actual — the figure [budget-variance](../../../icm/domains/finance/budget-variance)
ties measured actuals out against, and a planned-outflow input to
[cash-flow-forecast](../../../icm/domains/finance/cash-flow-forecast). App-native silver
(archetype B), curated by humans, versioned and point-in-time auditable. Part of epic #1394
(Audrey FP&A expansion, decisions D2/D3/D5); framed by the
[data-and-automation doctrine](../../architecture/data-and-automation-doctrine.md).

## Source of record / authority

**Human-authored and human-populated.** This table is **AGENT READ-ONLY** — read by Audrey,
**never written by any agent** (decision D5; ADR-0123 — finance is read-only, QBO owns money
movement). There is no agent write path and no autonomous-action kind, ever; the read-only
invariant is enforced at the grant layer (every role, **including the backend/agent runtime**,
has `SELECT` only). The only write path is a future human finance-admin populate surface (admin
GUI / seed), deliberately not yet granted.

An agent-derived **forecast is never persisted here** (D3): a forecast is a transparent
read-model projection over actuals with method + assumptions + as-of shown, not a stored truth.
`budget` holds only human-authored plan scenarios.

Versioned via `version`, with `effective_from` / `effective_to` giving point-in-time audit
(`effective_to IS NULL` = currently effective).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account` | text | plan account / GL line label (e.g. `Revenue:Recurring`, `OpEx:Payroll`); text, not a FK — actuals join by this key inside read-models only |
| `category` | enum `budget_category` | `revenue` · `cogs` · `opex` · `capex` · `headcount` · `other` |
| `period_start` | date | first day of the plan period |
| `grain` | enum `budget_grain` | `month` · `quarter` · `year` (width of the period) |
| `amount` | numeric(14,2) | the planned amount (the plan side of plan-vs-actual) |
| `currency` | text | default `USD` |
| `scenario` | text | named plan version; default `plan`. Human-authored only — never an agent forecast (D3) |
| `fiscal_year` | int | |
| `version` | int | default 1 |
| `effective_from` / `effective_to` | date | null `effective_to` = currently effective (point-in-time auditable) |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | `updated_at` maintained by trigger |

## Joins

No FKs out — a standalone plan registry. Inside finance read-models it is joined to **actuals**
by `account` / `period_start` text keys (never via a FK): to attested time + approved expense
(`time_record`, `expense_item`), to the AR/invoice mirror (`invoice`), and to the governed
metric layer (`metric_definition`, the `*_allocation_model` views) for the actual side of each
variance. Referenced **read-only** by `budget-variance` and `cash-flow-forecast`.

## Notes

No PII — an operating plan, not personal data. Individual pay rates are **never** stored here;
they live only in payroll-scoped time facts and feed the plan as aggregates. No secrets. The
agent-read-only invariant (D5/ADR-0123) is enforced at the grant layer: every role including the
backend/agent runtime has `SELECT` only — there is no agent or app write path in this migration.
