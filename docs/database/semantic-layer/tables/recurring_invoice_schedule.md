---
type: Reference / Config
title: recurring_invoice_schedule
entity: recurring_invoice_schedule
archetype: H
description: App-native recurring-billing template — the cadence (RRULE subset) + line items the MSP authors per account; the generator emits one generated_invoice draft per due period. NO QBO write (QuickBooks read-only on our side, ADR-0085); the invoice push is Mark-gated.
resource: ../../../decision-records/ADR-0085-qbo-payment-fact-purchase-simple-start.md
tags: [config, finance, accounts-receivable, invoicing, recurring, qbo, archetype-h]
data_class: financial
timestamp: 2026-06-23T00:00:00Z
---

# recurring_invoice_schedule

The recurring-billing **template** — the cadence and line items the MSP authors to bill an
account on a schedule (e.g. a monthly managed-services retainer). The **billing (money-out)**
leg, the inverse of the read-only AR mirror: [`invoice`](invoice.md) (`invoice_mirror`) covers
money **already** billed; this is the template for money **to be** billed. The recurring
generator (`src/lib/recurring-invoice.ts`) reads a schedule and emits one
[`generated_invoice`](generated_invoice.md) draft per due period. First tracer slice of epic
[#1045](https://github.com/markdconnelly/ImperionCRM/issues/1045) (AR/AP & cash-flow),
child [#1095](https://github.com/markdconnelly/ImperionCRM/issues/1095). Migration `0199`
(placeholder — claimed at merge).

## Source of record / authority

- **The website is the system of record for the recurring-billing template** (cadence, line
  items, terms, status). This is operations config the MSP owns; it exists nowhere else.
- **QuickBooks remains the SoR for the resulting invoice** and is **read-only on our side**
  ([ADR-0085](../../../decision-records/ADR-0085-qbo-payment-fact-purchase-simple-start.md)).
  Generation produces app-side **drafts** only — there is **no app→QBO write path** in this
  slice and the invoice-write OAuth scopes are **Mark-gated**. The draft becomes a real invoice
  only when the future gated backend push POSTs it; the mirror then picks it up read-only.
- **Cadence reuses the RRULE-subset engine** (`src/lib/recurrence.ts`, ADR-0070 E2) already used
  by task recurrence — one cadence vocabulary across the app, no second parser.
- **Idempotency anchor.** `next_run_on` is the materialised next-due day the generator targets;
  `last_generated_period` is the last period it billed. Generation is deterministic and
  catch-up-safe — see [`generated_invoice`](generated_invoice.md) for the `(schedule, period)`
  uniqueness that guarantees no double-billing.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | surrogate PK |
| `tenant_id` | uuid | scopes the schedule |
| `account_id` | uuid | billed business → [`account`](account.md); FK, CASCADE on delete |
| `qbo_customer_id` | text | QBO customer the gated push bills (= bronze `qbo_customers.customer_id`); not an FK (QBO read-only); nullable |
| `name` | text | human label for the worklist (not PII) |
| `rrule` | text | RFC-5545 RRULE subset (`FREQ=DAILY\|WEEKLY\|MONTHLY;INTERVAL=n`), parsed by `src/lib/recurrence.ts` |
| `line_items` | jsonb | `[{ description, quantity, unit_amount }]`; QBO computes tax/totals at push |
| `currency` | text | default `USD` |
| `net_terms_days` | smallint | net days from txn date → due date (`>= 0`); the aging-clock terms |
| `status` | `recurring_invoice_status` enum | `active` · `paused` · `ended` |
| `start_on` | date | first occurrence seed |
| `end_on` | date | schedule close, or null = open-ended (`end_on >= start_on`) |
| `next_run_on` | date | materialised next-due day the generator targets |
| `last_generated_period` | text | periodKey of the most recently generated draft, or null |
| `created_at` / `updated_at` | timestamptz | timestamps |

## Joins

- `account_id` → [`account`](account.md) (the billed business; firm FK).
- `qbo_customer_id` → bronze `qbo_customers.customer_id` (the QBO customer the gated push bills;
  business-key, not an FK — QBO is read-only).
- **Consumers:** the recurring generator (`src/lib/recurring-invoice.ts` `generateDueDrafts`,
  emitting [`generated_invoice`](generated_invoice.md) drafts) and a future recurring-billing
  admin surface ([#1095](https://github.com/markdconnelly/ImperionCRM/issues/1095)).

## Notes

Gated by `invoicing:read` / `invoicing:write` (admin∨finance, ADR-0030). The billed party is a
**business** (account / QBO customer) — **no personal PII** (no contact name/email/phone), no
secrets. Line items are service descriptions and amounts, not client identifiers. **App-native:
nothing here writes to QuickBooks; the invoice push is a separate Mark-gated slice.**
