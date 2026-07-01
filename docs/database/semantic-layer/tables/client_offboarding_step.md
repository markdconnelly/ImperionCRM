---
type: Silver Table
title: client_offboarding_step
entity: client_offboarding_step
archetype: B
description: The deprovision/teardown checklist child of client_offboarding — one row per data-return / deprovision / teardown / license-reclaim / finance / comms step, with owner seam, always_gate, and close-on-verification status.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [silver, customer-success, offboarding, checklist]
data_class: client_pii
timestamp: 2026-07-01T00:00:00Z
---

# client_offboarding_step

The **checklist child** of [`client_offboarding`](client_offboarding.md) — the
[`onboarding_step`](onboarding_step.md) mirror run in **reverse** (B8 provision-with-undo,
tear-down direction): one row per concrete offboarding step — data-return, deprovision,
project/asset teardown, license reclaim, finance, comms — assembled by the 08-O plan step.
Issue [#1622](https://github.com/markdconnelly/ImperionCRM/issues/1622), epic
[#1534](https://github.com/markdconnelly/ImperionCRM/issues/1534).

## Source of record / authority

**Imperion app-native** (single SoR), written by the backend offboarding executor
(approval-gated, never a direct silver write); read-only to web + agents. A step is
**idempotent per `(offboarding_id, code)`** (UNIQUE) — re-assembling the checklist UPSERTs
against the stable `code`, never duplicates. `owner_seam` carries the **A11 cross-owner
label** ('celeste-comms', 'osiris-jml', 'pierce-teardown', 'vance-license',
'audrey-finance'): Celeste owns the record and the clock, **never the destructive act**.
`always_gate` defaults **true** — a step must be explicitly marked reversible-internal to
ride without a human gate (A2 classes 1–4 stay gated regardless of dial). Status closes
**on verification** (A9c): `fired` (the act was kicked off) is never terminal — `verified`
(read-back confirmed it landed) is the only DONE.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `offboarding_id` | uuid | FK → `client_offboarding` (`ON DELETE CASCADE`) — the parent engagement |
| `code` | text | stable per-offboarding key — the idempotent upsert target |
| `category` | enum `client_offboarding_step_category` | `data_return` · `deprovision` · `teardown` · `license_reclaim` · `finance` · `comms` — the 08-O checklist buckets |
| `title` | text | the step, human-readable |
| `owner_seam` | text | the A11 owner label — WHO actuates (Osiris deprovision, Pierce teardown, …) |
| `always_gate` | boolean | default `true` — destructive/irreversible/client-visible steps stay human-approved regardless of dial |
| `status` | enum `client_offboarding_step_status` | `pending` · `blocked` · `approved` · `fired` · `verified` · `skipped` — close-on-verification (A9c) |
| `fired_at` / `verified_at` | timestamptz | kicked-off vs read-back-confirmed timestamps |
| `note` | text | basis/verification pointer, never client verbatim |
| `created_at` / `updated_at` | timestamptz | `updated_at` via trigger |

**Constraint:** `client_offboarding_step_code_uniq` — `UNIQUE (offboarding_id, code)`.

## Joins

- `offboarding_id` → [`client_offboarding`](client_offboarding.md) (the header; account +
  retention clock live there).
- Seam targets referenced, never duplicated (D3): Osiris JML leaver deprovision (OP-04-12),
  Pierce delivery teardown (Stream 03), Vance shelfware reclaim
  ([`license_assignment`](license_assignment.md)), Audrey final invoice/credit
  ([`invoice`](invoice.md) / 08-P).

## Notes

data_class is `client_pii` (**always-gate**) via the parent — step titles/notes describe a
named client's teardown. Notes are basis pointers, never client verbatim, no secrets. No
PII values appear in this doc — resolve specifics against the live read-only DB.
