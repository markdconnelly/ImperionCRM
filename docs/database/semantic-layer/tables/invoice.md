---
type: Silver Table
title: invoice
description: Read-only AR/invoice MIRROR over QuickBooks — observability only; aging derived in-view, no app-side AR object, no write path to QBO.
resource: ../../../decision-records/ADR-0085-qbo-payment-fact-purchase-simple-start.md
tags: [silver, finance, invoice, accounts-receivable, mirror, archetype-b]
timestamp: 2026-06-16T00:00:00Z
---

# invoice

The accounts-receivable surface — money owed **to** the MSP by its clients. One row per
QuickBooks Online invoice, **mirrored read-only** for observability: the
order-to-cash / revenue-in leg the Collections (AR-dunning) and Controller (reconciliation-
assurance) agents reason over ([#667](https://github.com/markdconnelly/ImperionCRM/issues/667),
[#668](https://github.com/markdconnelly/ImperionCRM/issues/668)). It is **not** an app-owned AR
object: it is a thin projection (`invoice_mirror` VIEW, migration `0121`) over bronze
`qbo_invoices` (migration 0120, LP #197 QBO pull), exactly as
[`ticket`](ticket.md) mirrors Autotask. Governed by
[ADR-0085](../../../decision-records/ADR-0085-qbo-payment-fact-purchase-simple-start.md) (QBO
read-only financial posture) with [ADR-0044](../../../decision-records/ADR-0044-silver-contracts-tickets.md)
(external-SoR read-only-mirror discipline).

## Source of record / authority

- **QuickBooks Online is the system of record** for every invoice field (amount, balance,
  due date, status). It is **read-only on our side** — there is **no app→QBO write path** and
  no stored AR state. The mirror reflects whatever the latest LP QBO pull landed in bronze.
- **The "own vs mirror" decision is RESOLVED as MIRROR** ([#668](https://github.com/markdconnelly/ImperionCRM/issues/668)):
  aging is observed, never owned. The Collections and Controller agents **detect / draft /
  escalate** against this surface; they **never move money** — collecting a payment, voiding,
  or re-issuing happens in QuickBooks by a human.
- **Aging is derived in-view, not stored.** `is_open`, `days_overdue`, and `aging_bucket` are
  recomputed on every read against `CURRENT_DATE` and the latest pulled balance/due_date — so
  the pipeline's normal QBO pull *is* the refresh; no bronze→silver merge job exists or is
  needed (the reason a VIEW was chosen over a materialized table).
- **The silver `account` link is best-effort.** QBO's `customer_ref` firmly joins
  `qbo_customers.customer_id`; the QBO-customer → silver-`account` link is established LP-side
  (migration 0120) but no FK exists on `account` yet, so the view resolves the account by a
  case-insensitive **name** match (LEFT JOIN). A miss leaves `account_id` NULL and keeps the
  QBO customer name — the row is never blocked on a resolved account.

## Schema

The view type-casts the all-text bronze envelope (migration 0120) and adds derived AR columns.

| Column | Type | Notes |
|---|---|---|
| `qbo_invoice_id` | text | QBO Invoice Id (stable natural key) = bronze `external_id` |
| `doc_number` | text | human invoice number (QBO `DocNumber`); may be null |
| `qbo_customer_id` | text | QBO `CustomerRef.value` → `qbo_customers.customer_id` |
| `qbo_customer_name` | text | QBO `CustomerRef.name` (billed-entity name — a business identifier, not personal PII) |
| `account_id` | uuid | silver `account`, resolved best-effort by name; **null on a miss** |
| `account_name` | text | resolved silver account name, or null |
| `txn_date` | date | invoice date (cast from bronze text) |
| `due_date` | date | payment-due date; the aging clock start |
| `total_amount` | numeric(14,2) | invoice total (cast/sanitized from bronze text; null when unparseable) |
| `balance` | numeric(14,2) | open AR balance; **`balance > 0` ⟺ `is_open`** |
| `currency` | text | QBO `CurrencyRef.value` |
| `email_status` | text | QBO `EmailStatus` (e.g. `NotSet`, `EmailSent`) |
| `is_open` | boolean | derived: `balance > 0` (single open-AR truth) |
| `days_overdue` | integer | derived: whole days past `due_date`, **only while open & overdue**; null otherwise (not "0") |
| `aging_bucket` | text | derived enum: `paid` (settled) · `current` (open, not past due) · `1-30` · `31-60` · `61-90` · `90+` (open & overdue tiers) |

## Joins

- `qbo_customer_id` → bronze `qbo_customers.customer_id` (the billed entity; firm join).
- `account_id` → silver [`account`](account.md), **best-effort by name** (LEFT JOIN; null on a
  miss — observability only, never authoritative).
- Bronze source: `qbo_invoices` (migration 0120, LP #197). The companion bronze
  `qbo_payments` (payment receipts) is **not** joined here — payment match/apply is a future
  Pipeline/Backend concern; `balance > 0` from the invoice envelope is the open-AR signal this
  surface needs.
- **Downstream consumers:** the AR observability surface (collections worklist; aging rollup in
  `lib/invoice-aging.ts`) and the Collections (AR-dunning) + Controller (reconciliation-
  assurance) ICM agents ([#667](https://github.com/markdconnelly/ImperionCRM/issues/667)) — all
  read-only.

## Notes

Invoice amounts, balances, and customer names are **commercially sensitive** — query the live
read-only DB for actuals; never inline row-level values or client identifiers here. No personal
PII (customer email / phone / billing address) is selected by the view — it stays in the bronze
`raw_payload`. QuickBooks is read-only on our side: this mirror has no write path, and no agent
acting on it may move money.
