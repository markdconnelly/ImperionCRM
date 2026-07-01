---
type: Silver Table
title: client_offboarding
entity: client_offboarding
archetype: B
description: The client-offboarding / retention-state header — termination request, data-return obligation + status, retention/legal-hold clock, and final-invoice/credit reconciliation status, on a requested → data_returned → deprovisioned → closed state machine.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, customer-success, offboarding, retention]
data_class: client_pii
timestamp: 2026-07-01T00:00:00Z
---

# client_offboarding

The **offboarding / retention-state model** the 08-O procedure (Celeste + Osiris + Pierce —
termination → data-return + deprovision) was missing: for each terminating client
(`account`), the **termination request** (reason + notice + effective date), the
**data-return obligation + status**, the **retention/legal-hold clock** (deadline-sentinel
B9), and **final-invoice/credit reconciliation status**. App-native silver (archetype B),
born here; issue [#1622](https://github.com/markdconnelly/ImperionCRM/issues/1622), epic
[#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534) ($100M gap-fill, Cluster
5). Child checklist: [`client_offboarding_step`](client_offboarding_step.md).

## Source of record / authority

**Imperion app-native** — the single system of record for offboarding/retention state. The
backend **offboarding executor** writes it (approval-gated, server-side, **never a direct
silver write**); read-only to web (render) and to agents (Celeste plans the teardown and
watches the retention clock in 08-O; she **never actuates the destructive acts** — the A11
cross-owner seam: Osiris owns identity/access deprovision, Pierce owns project/asset
teardown). The state machine is `requested → data_returned → deprovisioned → closed`, with
`cancelled` as the save-the-account off-ramp (08-Q); **closed hardens** — a re-onboard is a
new gated provision (OP-03-01), never an undo (B8-reverse).

**The retention clock is dial-proof.** `retention_hold_until` + `legal_hold` are a
**structural refuse-precondition** (B9 + A10 row 4): no deletion before the hold expires and
never under legal hold — earned autonomy cannot auto-cross it. Money is **status-only**
here: amounts live in [`invoice`](invoice.md) / [`collections_activity`](collections_activity.md)
(QBO is the SoR for money, ADR-0123); the credit half is 08-P (B6 money-gate).

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (`ON DELETE CASCADE`) — the terminating client |
| `contract_id` | uuid | FK → `contract` (`ON DELETE SET NULL`) — the terminating contract (optional) |
| `status` | enum `client_offboarding_status` | `requested` · `data_returned` · `deprovisioned` · `closed` · `cancelled` (default `requested`) — the state machine |
| `reason` | enum `client_offboarding_reason` | `non_renewal` · `termination_notice` · `admin_declared` · `other` — how the termination signal arrived (the 08-O triggers) |
| `reason_note` | text | grounding pointer (NOT pii: 'contract #N non-renewal, as-of …'), never client verbatim (A5) |
| `initiated_by` | text | attributed principal (UPN or agent slug) |
| `termination_notice_at` | timestamptz | when the termination signal landed |
| `effective_at` | timestamptz | contractual termination effective date |
| `data_return_required` | boolean | default `true` — the contractual data-return obligation |
| `data_return_status` | enum `client_offboarding_data_return_status` | `pending` · `in_progress` · `returned` · `confirmed` · `not_required` — `confirmed` = client acknowledged (the B7 client-facing confirmation, always-gate) |
| `data_return_scope` | text | scope description, never client data |
| `data_return_confirmed_at` | timestamptz | set on `confirmed` |
| `retention_hold_until` | timestamptz | **the B9 retention clock — no deletion before this** |
| `legal_hold` | boolean | default `false` — **never delete while true** |
| `legal_hold_reason` / `legal_hold_released_at` | text / timestamptz | hold basis + release (legal owns release) |
| `final_invoice_status` | enum `client_offboarding_invoice_status` | `pending` · `issued` · `reconciled` · `waived` — status only, no amounts (B6 peel) |
| `final_invoice_id` | uuid | FK → `invoice` (`ON DELETE SET NULL`) — the QBO-mirror final invoice, once issued |
| `credit_ref` | text | pointer to the 08-P service-credit record (no amounts) |
| `requested_at` / `data_returned_at` / `deprovisioned_at` / `closed_at` / `cancelled_at` | timestamptz | state-machine timestamps |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**Constraint:** `client_offboarding_open_account_uniq` — partial UNIQUE on `account_id`
`WHERE status NOT IN ('closed','cancelled')`: **one OPEN offboarding per account**;
closed/cancelled rows are history.

## Joins

- `account_id` → [`account`](account.md) (the client); `contract_id` → [`contract`](contract.md)
  (the terminating contract); `final_invoice_id` → [`invoice`](invoice.md) (QBO mirror).
- Child: [`client_offboarding_step`](client_offboarding_step.md) — the deprovision/teardown
  checklist (`offboarding_id`).
- Upstream triggers: 08-E non-renewal / 08-D terminal health / Chase lost-churned (SEAM A11).
  Downstream seams: Osiris JML (OP-04-12 leaver deprovision), Pierce teardown (Stream 03),
  Vance license reclaim (Stream 07), Audrey final AR/credit (08-P).

## Notes

This entity **HOLDS `client_pii`** at runtime — a named client's termination, data-return
scope, and legal-hold posture. data_class is `client_pii` (**always-gate**). Notes/scope
columns are basis pointers, never client verbatim. No PII values appear in this doc —
resolve specifics against the live read-only DB.
