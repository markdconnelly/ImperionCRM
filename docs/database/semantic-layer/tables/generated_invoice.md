---
type: Silver Table
title: generated_invoice
entity: generated_invoice
archetype: D
description: One generated invoice DRAFT per (schedule, period) — the gated QBO-push queue/ledger. Archetype D sidecar, app-native until the push exists; UNIQUE (schedule, period) makes generation idempotent. NO QBO write in this slice — the push is Mark-gated (ADR-0085).
resource: ../../../decision-records/ADR-0085-qbo-payment-fact-purchase-simple-start.md
tags: [silver, finance, accounts-receivable, invoicing, recurring, draft, qbo, archetype-d, app-native]
data_class: financial
timestamp: 2026-06-23T00:00:00Z
---

# generated_invoice

The per-period invoice **draft** the recurring generator emits — the **queue/ledger** of
to-be-billed invoices on their way to QuickBooks. One row per
([`recurring_invoice_schedule`](recurring_invoice_schedule.md), period): the generator reads a
schedule, computes the due occurrences up to today, and writes a draft for each. First tracer
slice of epic [#1045](https://github.com/markdconnelly/ImperionCRM/issues/1045), child
[#1095](https://github.com/markdconnelly/ImperionCRM/issues/1095). Migration `0901`
(placeholder — claimed at merge).

It is **archetype D** (write-back sidecar — an app-owned object whose eventual write target is an
external SoR) **but app-native until the push exists**, exactly like
[`collections_activity`](collections_activity.md): agents and humans review/approve drafts here;
the actual QBO write is a **separate, Mark-gated slice**.

## Source of record / authority

- **The website is the SoR for the draft** (line items, computed dates, approval status) **until
  it is pushed**. Once the gated backend job POSTs it to QuickBooks, **QBO becomes the SoR for the
  invoice** and the read-only [`invoice`](invoice.md) mirror picks it up.
- **QuickBooks is read-only on our side today**
  ([ADR-0085](../../../decision-records/ADR-0085-qbo-payment-fact-purchase-simple-start.md)) — there
  is **no app→QBO write path** in this slice and the invoice-write OAuth scopes are **Mark-gated**.
  `qbo_invoice_id` and `pushed_at` are written **ONLY** by that future gated push and stay NULL
  until then.
- **Idempotency — no double-billing.** `UNIQUE (schedule_id, period_key)` is the guarantee: one
  draft per schedule per period. The generator (`src/lib/recurring-invoice.ts`) is deterministic
  and inserts with `ON CONFLICT DO NOTHING`, so a retry or an overlapping run is a no-op. This is
  the time/expense → Autotask idempotency-key discipline (ADR-0074/0082/0083) applied to the QBO
  write leg.
- **`total_amount` is an app-side draft subtotal** (Σ qty×unit_amount, summed in cents for
  display/approval). **QBO recomputes tax and totals at push** — this is not the authoritative
  invoice total.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | surrogate PK |
| `tenant_id` | uuid | scopes the draft |
| `schedule_id` | uuid | parent → [`recurring_invoice_schedule`](recurring_invoice_schedule.md); FK, CASCADE on delete |
| `period_key` | text | the billed occurrence as a calendar day (`yyyy-mm-dd`); the idempotency anchor |
| `txn_date` | date | invoice date (the occurrence day) |
| `due_date` | date | `txn_date` + schedule `net_terms_days` |
| `line_items` | jsonb | snapshot of the billed lines `[{ description, quantity, unit_amount }]` |
| `currency` | text | default `USD` |
| `total_amount` | numeric(14,2) | app-side draft subtotal (`>= 0`); QBO recomputes at push |
| `status` | `generated_invoice_status` enum | `pending` · `drafted` · `pushed` · `failed` · `skipped` |
| `qbo_invoice_id` | text | QBO Invoice Id once pushed (= [`invoice`](invoice.md) `qbo_invoice_id`); **NULL until the gated push** |
| `pushed_at` | timestamptz | set by the gated push; NULL until then |
| `last_error` | text | last push error (failed status); operational text, no PII/secrets |
| `created_at` / `updated_at` | timestamptz | timestamps |

Unique on `(schedule_id, period_key)` — one draft per schedule per period.

## Joins

- `schedule_id` → [`recurring_invoice_schedule`](recurring_invoice_schedule.md) (the template that
  produced this draft).
- `qbo_invoice_id` → [`invoice`](invoice.md) `invoice_mirror.qbo_invoice_id` once pushed (the
  mirrored AR fact this draft becomes; business-key, not an FK — the mirror is a VIEW).
- **Consumers:** the recurring generator (`src/lib/recurring-invoice.ts`), a future draft-review /
  approval surface, and the future Mark-gated QBO-push backend job
  ([#1095](https://github.com/markdconnelly/ImperionCRM/issues/1095)).

## Notes

Gated by `invoicing:read` / `invoicing:write` (admin∨finance, ADR-0030). The billed party is a
**business** — **no personal PII** (no contact name/email/phone/address), no secrets; `last_error`
is operational diagnostics only. **App-native: the QBO write is a separate Mark-gated slice; no row
here calls QuickBooks or moves money.**
