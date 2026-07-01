---
type: Silver Table
title: carrier_contract
entity: carrier_contract
archetype: B
description: The commercial carrier/telco agreement — provider, term, renewal/cancel-by dates, MRC/NRC — the substrate Vance's B9 deadline-sentinel watches for renewal/cancel windows (OP-04-14).
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, finance, vendor, telco, carrier, deadline-sentinel]
data_class: financial
timestamp: 2026-07-01T00:00:00Z
---

# carrier_contract

The **commercial half of the carrier / circuit / telco lifecycle** (OP-04-14, Stream 04↔05↔07
seam): one row per carrier/telco agreement — provider, term, renewal and cancel-by dates,
monthly/one-time cost. App-native silver (archetype B), born in
[#1651](https://github.com/markdconnelly/ImperionCRM/issues/1651) (epic
[#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534)). It is the substrate
**Vance's B9 deadline-sentinel** (ADR-0136) watches: `renewal_date` / `cancel_by_date` fire
alerts at policy lead times (T-30 / T-7 / T-1). **B9 rule: escalate-to-terminal, never
auto-actuate** — a renew/cancel/order commit is `always_gate` (money + binding); a missed
cancel-by is a *logged escalation failure*, never a license to commit autonomously.

`account_id` is nullable: **NULL = Imperion's own carrier contract** (dogfood — Imperion's
own circuits run the same flow). Distinct from the kernel [`contract`](contract.md)
(Autotask service agreements): this is the *vendor-side* telco paper, not the client MSA.

## Source of record / authority

**Imperion app-native** (curated) today — no carrier feed exists. A backend **telco
executor** writes rows (approval-gated, server-side, **never a direct silver write**);
humans/Vance curate via propose→approve. `source` + `external_ref` carry ADR-0039-style
provenance (`UNIQUE (source, external_ref)`) so a future carrier/bill ingest merges
idempotently without reshaping. Read-only to web (render) and to agents (Vance reads the
deadline clock, Stream 07). **Dormant / propose-only until built** (ADR-0136 A5c).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (`ON DELETE SET NULL`) — the served client; NULL = Imperion's own |
| `carrier_name` | text | the provider (NOT NULL) |
| `carrier_account_number` | text | billing account at the carrier |
| `contract_number` | text | the carrier's agreement/order number |
| `status` | enum `carrier_contract_status` | `draft` · `ordered` · `active` · `month_to_month` · `cancelled` · `expired` · `unknown` |
| `term_months` | integer | initial term (> 0) |
| `start_date` / `end_date` | date | term window |
| `renewal_date` | date | when it (auto-)renews — **B9 sentinel input** (partial index) |
| `cancel_by_date` | date | last day to give non-renewal notice — **B9 sentinel input** (partial index) |
| `auto_renew` | boolean | default false |
| `notice_days` | integer | required cancellation-notice window (≥ 0) |
| `mrc` / `nrc` / `early_termination_fee` | numeric(12,2) | monthly recurring · one-time · ETF |
| `currency` | text | default `USD` |
| `source` / `external_ref` | text | provenance; `UNIQUE (source, external_ref)`; default `curated` |
| `notes` | text | short operational notes — never secrets or client verbatim |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

## Joins

- `account_id` → `account` (the served client; NULL = Imperion's own).
- ← [`circuit`](circuit.md)`.carrier_contract_id` — the circuits riding this agreement
  (the technical half; cost rollup lives here, per-circuit MRC there).
- Cost reconcile → Vance's Stream 07 procurement/vendor seam; expiring paper feeds the
  renewal GATE (4-part easy-button, always routed to a human).

## Notes

data_class **`financial`** (always-gate) — MRC/NRC/ETF are vendor-spend figures. No PII:
carrier names, dates, and amounts only; no personal data, no secrets. No row-level values
appear in this doc — resolve specifics against the live read-only DB. Migration 0254
([#1651](https://github.com/markdconnelly/ImperionCRM/issues/1651)).
