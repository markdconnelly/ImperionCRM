---
type: Silver Table
title: invoice
entity: invoice
archetype: B
description: Curated, pipeline-populated read-only AR/invoice MIRROR of QuickBooks — no app-side AR object, no agent/QBO write path; AR-aging is a derived read-model over it, not a separate entity.
resource: ../../../decision-records/ADR-0140-ar-invoice-own-vs-mirror.md
tags: [silver, finance, invoice, accounts-receivable, mirror, archetype-b]
data_class: financial
timestamp: 2026-06-30T00:00:00Z
---

# invoice

The accounts-receivable surface — money owed **to** the MSP by its clients. One row per
QuickBooks Online invoice, **mirrored read-only**: the order-to-cash / revenue-in leg the
Collections (AR-dunning) and Controller (reconciliation-assurance) agents reason over
([#667](https://github.com/markdconnelly/ImperionCRM/issues/667),
[#668](https://github.com/markdconnelly/ImperionCRM/issues/668)) and the actuals side Audrey's
FP&A cash-flow / AR-aging read-models tie out against
([#1580](https://github.com/markdconnelly/ImperionCRM/issues/1580), epic
[#1394](https://github.com/markdconnelly/ImperionCRM/issues/1394)). It is **not** an app-owned AR
object: it is a curated, **pipeline-populated** silver `invoice` TABLE (migration `0241`)
mirroring bronze `qbo_invoices` (migration 0120, LP #197 QBO pull), exactly as
[`ticket`](ticket.md) mirrors Autotask. Governed by
[ADR-0140](../../../decision-records/ADR-0140-ar-invoice-own-vs-mirror.md) (own-vs-mirror RESOLVED
as MIRROR) and [ADR-0123](../../../decision-records/ADR-0123-agent-first-build-doctrine.md) (QBO =
system of record for money; finance read-only), with
[ADR-0044](../../../decision-records/ADR-0044-silver-contracts-tickets.md) (external-SoR
read-only-mirror discipline).

## Source of record / authority

- **QuickBooks Online is the system of record** for every invoice field (amount, balance,
  due date, status) — [ADR-0123](../../../decision-records/ADR-0123-agent-first-build-doctrine.md):
  QBO owns money. It is **read-only on our side** — there is **no app→QBO write path** and **no
  agent write path**. The mirror reflects whatever the latest QBO pull landed in bronze.
- **The "own vs mirror" decision is RESOLVED as MIRROR**
  ([#668](https://github.com/markdconnelly/ImperionCRM/issues/668) /
  [#1580](https://github.com/markdconnelly/ImperionCRM/issues/1580),
  [ADR-0140](../../../decision-records/ADR-0140-ar-invoice-own-vs-mirror.md)): Imperion does NOT
  own an app-native AR/invoice ledger. The curated silver `invoice` is a real **table populated by
  the pipeline's bronze→silver merge — a *process*, not an agent** — carrying the meaningful QBO
  invoice fields type-cast from the all-text bronze envelope. The Collections + Controller agents
  and Audrey FP&A **detect / draft / escalate** against it; they **never move money** and **never
  write it** — collecting a payment, voiding, or re-issuing happens in QuickBooks by a human, and
  any dunning SEND is a human easy-button on another agent's side. Audrey is read-only L2.
- **App-native state exists only for the dunning workflow.** The dunning *workflow*-state (who we
  reminded, when, where it stands) lives in [`collections_activity`](collections_activity.md)
  (migration 0122), keyed by `qbo_invoice_id`. It is **not** duplicated here — no amounts/balances/
  due dates are stored in the overlay; those are read from this mirror.
- **AR-aging is a DERIVED read-model, not a stored column and not a separate entity.** `is_open`,
  `days_overdue`, and `aging_bucket` (`current` / `1-30` / `31-60` / `61-90` / `90+`, plus `paid`)
  are computed over the silver `invoice` table (`due_date` + `balance` + `status` → bucket) at
  query time. There is **no separate `ar_item` silver entity** — that would be entity sprawl over
  the same QBO fact. Cash-flow forecast + plan-vs-actual
  ([#1722](https://github.com/markdconnelly/ImperionCRM/issues/1722)) tie actuals out against this
  same `invoice` surface.
- **Relationship to the 0121 `invoice_mirror` VIEW.** The VIEW (migration 0121) was the first AR
  observability projection (aging recomputed on every read). The curated silver entity is now this
  pipeline-populated **table** (migration `0241`) — a stable, indexable, joinable surface for FP&A
  read-models. The VIEW is **left in place** (it carries the same `qbo_invoice_id` natural key, so
  `collections_activity` keeps resolving); retiring or re-pointing it at the table is a follow-up
  cutover.
- **The silver `account` link is best-effort.** QBO's `customer_ref` firmly joins
  `qbo_customers.customer_id`; the QBO-customer → silver-`account` link is established LP-side
  (migration 0120) but no FK exists on `account` yet, so account resolution is a case-insensitive
  **name** match resolved in read-models (LEFT JOIN; null on a miss) — never authoritative, never
  blocks a row.

## Schema

The pipeline merge upserts the silver `invoice` table from the all-text bronze envelope
(migration 0120), type-casting the meaningful QBO fields. **AR-aging columns are NOT stored** —
they are a derived read-model over the stored columns (see *Source of record / authority*).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | surrogate PK |
| `tenant_id` | uuid | scopes the mirror row |
| `qbo_invoice_id` | text | QBO Invoice Id (stable natural key) = bronze `external_id`; UNIQUE per (tenant, invoice); the key `collections_activity` + the 0121 VIEW resolve by |
| `doc_number` | text | human invoice number (QBO `DocNumber`); may be null |
| `qbo_customer_id` | text | QBO `CustomerRef.value` → `qbo_customers.customer_id` |
| `qbo_customer_name` | text | QBO `CustomerRef.name` (billed-entity name — a business identifier, not personal PII) |
| `issue_date` | date | invoice date (QBO `TxnDate`, cast from bronze text) |
| `due_date` | date | payment-due date; the AR-aging clock start |
| `total_amount` | numeric(14,2) | invoice total (cast/sanitized from bronze text; null when unparseable) |
| `balance` | numeric(14,2) | open AR balance; **`balance > 0` ⟺ open** (the open-AR signal the aging read-model partitions on) |
| `status` | text | QBO `EmailStatus` / settlement status (mirrored as-is) |
| `currency` | text | QBO `CurrencyRef.value` |
| `created_at` / `updated_at` | timestamptz | row timestamps (`set_updated_at` trigger) |

**Derived AR-aging read-model** over the table (not stored): `is_open` (`balance > 0`),
`days_overdue` (whole days past `due_date`, only while open & overdue; null otherwise),
`aging_bucket` (`paid` (settled) · `current` (open, not past due) · `1-30` · `31-60` · `61-90` ·
`90+`).

## Joins

- `qbo_customer_id` → bronze `qbo_customers.customer_id` (the billed entity; firm join).
- silver [`account`](account.md), **best-effort by name** (resolved in read-models; null on a
  miss — observability only, never authoritative).
- Bronze source: `qbo_invoices` (migration 0120, LP #197) — the pipeline bronze→silver merge
  upserts this table from it. The companion bronze `qbo_payments` (payment receipts) is **not**
  joined here — payment match/apply is a future Pipeline/Backend concern; `balance > 0` from the
  invoice envelope is the open-AR signal this surface needs.
- App-native overlay: [`collections_activity`](collections_activity.md) (migration 0122) keys to
  this mirror by `qbo_invoice_id` (business key; the dunning workflow-state, not duplicated here).
- **Downstream consumers (all read-only):** the AR observability surface (collections worklist;
  aging rollup in `lib/invoice-aging.ts`), the **Audrey FP&A cash-flow / AR-aging read-models**
  ([#1580](https://github.com/markdconnelly/ImperionCRM/issues/1580) /
  [#1722](https://github.com/markdconnelly/ImperionCRM/issues/1722)), and the Collections
  (AR-dunning) + Controller (reconciliation-assurance) ICM agents
  ([#667](https://github.com/markdconnelly/ImperionCRM/issues/667)).
- **Revenue join (#1092, profitability epic #1044).** resolved account + `issue_date` +
  `total_amount` feed the derived `revenue_allocation` view's **recognized leg** (per client ×
  month; `service_line` NULL — an invoice header carries no service line) and the governed
  `recognized_revenue` / `recognized_revenue_to_serve` metrics, the revenue partner to the
  cost-allocation `cost_to_serve` (#1091). The margin slice (#1093) composes
  `margin = recognized_revenue − cost_to_serve` by metric key.

## Notes

Invoice amounts, balances, and customer names are **commercially sensitive** — query the live
read-only DB for actuals; never inline row-level values or client identifiers here. No personal
PII (customer email / phone / billing address) is mirrored into the table — it stays in the bronze
`raw_payload`. QuickBooks is read-only on our side (ADR-0123): this mirror has no app→QBO write
path and **no agent write path** — web + the backend/agent runtime (Audrey, Collections,
Controller) get **SELECT only**; the pipeline merge role is the only writer (it populates the
mirror; it is not an agent). No agent acting on it may move money.
