---
type: Silver Table
title: collections_activity
entity: collections_activity
archetype: D
description: App-native dunning/collections workflow overlay keyed to the read-only invoice mirror by QBO invoice id. Archetype D sidecar but app-native — agents READ the mirror, WRITE here, NEVER write QuickBooks.
resource: ../../../decision-records/ADR-0085-qbo-payment-fact-purchase-simple-start.md
tags: [silver, finance, accounts-receivable, collections, dunning, overlay, archetype-d, app-native]
data_class: financial
timestamp: 2026-06-22T00:00:00Z
---

# collections_activity

The collections / accounts-receivable **dunning workflow state** — who chased an unpaid
invoice, when, on what channel, and where the conversation now stands. It is the state
QuickBooks **cannot** give us, layered on top of the read-only
[`invoice`](invoice.md) mirror: agents and humans **READ** the mirror (`invoice_mirror`
VIEW, migration `0121`) and **WRITE** this overlay
([#677](https://github.com/markdconnelly/ImperionCRM/issues/677), parent
[#668](https://github.com/markdconnelly/ImperionCRM/issues/668), epic
[#667](https://github.com/markdconnelly/ImperionCRM/issues/667)). Backs the collections
worklist UI ([#678](https://github.com/markdconnelly/ImperionCRM/issues/678)) and the
Collections (AR-dunning) ICM agent.

It is **archetype D** (write-back sidecar — an app-owned object hung off an external-SoR
fact) **but app-native, NOT synced to QuickBooks**: the "write-back" target is the
website's own collections worklist, never QBO. The AR twin of
`defender_incident_ticket_link` (app-owned context on a read-only mirrored fact).

## Source of record / authority

- **The website is the system of record for the dunning workflow state** (status,
  escalation, assignee, reminder log, notes). This is operations data the MSP owns — it
  exists nowhere else and is never reflected back to QuickBooks.
- **QuickBooks remains the SoR for the invoice itself** (amount, balance, due date) and is
  **read-only on our side** ([ADR-0085](../../../decision-records/ADR-0085-qbo-payment-fact-purchase-simple-start.md)).
  This overlay stores **no** amounts/balances/due dates — those are read live from
  [`invoice`](invoice.md). There is **no app→QBO write path** and **no money movement**:
  collecting/voiding/re-issuing happens in QuickBooks by a human; `promised` is a
  human-recorded promise-to-pay note, not a payment.
- **One CURRENT-state row per (tenant, invoice).** The per-reminder history is an
  append-only JSONB log on that one row (a reminder is a low-volume timeline read as a
  unit, not a queryable entity) — kept as a single-table overlay, no child table.
- **Agent posture** ([ADR-0087](../../../decision-records/ADR-0087-agent-orchestration-and-observability-layer.md)):
  the Collections agent detects/drafts/escalates against the mirror and records its action
  here; it never moves money.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | surrogate PK |
| `tenant_id` | uuid | scopes the overlay (resolved from `invoice_mirror` at write) |
| `qbo_invoice_id` | text | **business key** into `invoice_mirror.qbo_invoice_id` (= bronze `qbo_invoices.external_id`); **not an FK** — the mirror is a VIEW and QBO is read-only |
| `status` | `dunning_status` enum | `none` · `reminded` · `escalated` · `promised` · `paused` · `disputed` |
| `escalation_level` | smallint | escalation tier, 0 = none, increasing = further escalated (`>= 0`) |
| `assignee_user_id` | uuid | employee owning the chase → `app_user`; SET NULL on user delete; null = unassigned |
| `reminders` | jsonb | append-only log: `[{ at, channel, kind, note }]`; appended, never rewritten |
| `notes` | text | internal collections notes (not client-facing, not personal PII) |
| `created_at` / `updated_at` | timestamptz | overlay timestamps |

Unique on `(tenant_id, qbo_invoice_id)` — one current-state row per invoice.

## Joins

- `qbo_invoice_id` → [`invoice`](invoice.md) `invoice_mirror.qbo_invoice_id` (the mirrored
  AR fact this overlay annotates; business-key join, not an FK — the mirror is a VIEW).
- `assignee_user_id` → [`app_user`](app_user.md) (the owning employee).
- **Consumers:** the collections worklist UI ([#678](https://github.com/markdconnelly/ImperionCRM/issues/678)),
  the gated dunning **send** leg ([#679](https://github.com/markdconnelly/ImperionCRM/issues/679) —
  an approved reminder sent via the ADR-0058 approval-gated path appends an `email`-channel
  reminder + optional escalation bump through the same write accessor), and the Collections
  (AR-dunning) ICM agent ([#667](https://github.com/markdconnelly/ImperionCRM/issues/667)).
  Read accessor: `crm.getCollectionsActivity(qboInvoiceId)`; write: `crm.upsertCollectionsActivity`.

## Notes

Gated by `collections:read` / `collections:write` (admin∨finance, ADR-0030/0045) — AR
work, same finance gate as `contracts:write`. The overlay holds **workflow state only**:
no amounts, balances, or due dates are copied here, and no customer email/phone/address —
those stay in the read-only invoice mirror / bronze `raw_payload`. **App-native: nothing in
this overlay ever propagates to QuickBooks, and no agent acting on it may move money.**
Free-text `notes` are internal operational notes, never client identifiers or personal PII.
