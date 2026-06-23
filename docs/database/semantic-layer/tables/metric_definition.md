---
type: Reference Table
title: metric_definition
entity: metric_definition
archetype: H
description: The governed metric-definitions store — one row per business number's canonical contract (name, grain, unit, definition, owner, data_class). The headless-BI source of truth so agents and humans agree.
resource: ../../../decision-records/ADR-0062-reporting-bi-hub.md
tags: [reference, config, metrics, governance, bi, headless-bi]
data_class: operational
timestamp: 2026-06-22T00:00:00Z
---

# metric_definition

The **governed metric-definitions store**: one row per business number (MRR, gross margin,
technician utilization, tickets closed, agent compute cost, …), carrying its canonical
`name`, `grain`, `unit`, the `expression` that defines it, an `owner`, and a `data_class`
sensitivity. This is the **headless-BI contract** — the single place a number is defined, so
the human dashboards ([ADR-0062](../../../decision-records/ADR-0062-reporting-bi-hub.md), the
BI hub [#288](https://github.com/markdconnelly/ImperionCRM/issues/288)) and an agent acting
on numbers read the *same* definition and cannot disagree on "what is MRR". Epic
[#1050](https://github.com/markdconnelly/ImperionCRM/issues/1050); slice 1
[#1055](https://github.com/markdconnelly/ImperionCRM/issues/1055).

## Source of record / authority

**The website is the system of record** (admin-curated definitions; no external merge). A
definition is **deny-by-absence**: a surface may only report a governed number that has a
row here. The `expression` is the authority for *how* the number is computed; the backend
metric query endpoint ([#259](https://github.com/markdconnelly/ImperionCRM_Backend/issues/259),
`lookupMetric()`) and the `metric_lookup` sub-agent tool
([#264](https://github.com/markdconnelly/ImperionCRM_Backend/issues/264)) bind and execute it —
`metric_definition` never holds row-level data, only the formula. An `expression` is one of two
states: an **executable** `SELECT … AS value` scalar with `:named` temporal params the engine
binds, or **unbound** (a definitional fragment / NULL the engine cannot parse → status
`unbound`). The seed currently binds `agent_compute_cost` (over `agent_run`) and
`tickets_closed` (over silver `ticket`); `mrr`, `gross_margin`, and `technician_utilization`
remain unbound until a clean scalar source lands. Metric *values* (a snapshot/timeseries) are a
later slice; this entity is the contract.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `key` | text | NOT NULL, UNIQUE — stable machine handle agents/APIs reference, e.g. `mrr` |
| `name` | text | NOT NULL — human display name |
| `description` | text | what the number means and what it excludes |
| `grain` | text | NOT NULL — unit of aggregation, e.g. `company/monthly`, `per_technician/weekly`, `point_in_time` |
| `unit` | text | NOT NULL — `usd` \| `percent` \| `count` \| `hours` \| `ratio` |
| `expression` | text | the governed SQL/formula; bound by the metric engine (#259); NULL until bound |
| `owner` | text | accountable role/team, e.g. `finance`, `service-delivery` |
| `data_class` | text | NOT NULL — sensitivity class (the [#1034](https://github.com/markdconnelly/ImperionCRM/issues/1034) axis): `operational` \| `financial` \| `people_hr` \| `security_credentials` \| `client_pii` |
| `active` | boolean | NOT NULL default true — soft-retire without deleting |
| `created_at` / `updated_at` | timestamptz | audit |

UNIQUE `(key)`; indexes on `data_class`, `active`.

## Joins

- **Consumed by** the backend metric query endpoint (#259) at report time, and by the BI
  hub / dashboards (#288). Downstream metric-bearing surfaces — per-service profitability
  ([#1044](https://github.com/markdconnelly/ImperionCRM/issues/1044)) and the ROI "two
  numbers" dashboard ([#1048](https://github.com/markdconnelly/ImperionCRM/issues/1048)) —
  reference metrics by `key`.
- `data_class` is the shared sensitivity axis with OKF concepts and action contracts
  (#1034): the class a metric carries gates which callers/agents may read it.
- The `expression` references silver/operational entities (e.g. `contract`, `time_record`,
  the silver `ticket` table, `agent_run`) but stores no rows from them.

## Notes

No PII, no secrets — definitions are formulas over aggregates, not row-level data. Specific
metric *values* resolve against the live read-only DB / the metric engine, never this file.
