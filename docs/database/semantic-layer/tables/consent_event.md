---
type: Silver Table
title: consent_event
entity: consent_event
archetype: C
description: Append-only consent ledger — immutable per-channel opt-in/opt-out facts with lawful basis; the gate on every send and ad.
resource: ../../../decision-records/ADR-0014-consent-ledger-communications.md
tags: [silver, consent, compliance, ledger]
data_class: client_pii
timestamp: 2026-06-22T00:00:00Z
---

# consent_event

The append-only consent ledger. Governed by
[ADR-0014](../../../decision-records/ADR-0014-consent-ledger-communications.md) and
[ADR-0025](../../../decision-records/ADR-0025-contact-360-enrichment-and-lawful-basis.md).

## Source of record / authority

**Immutable, append-only — a change of mind is a new event, never an update.** The
authoritative "current" state is the derived view `current_consent` (latest event per
`contact × channel`). Read at **send time and ad-launch time**: outbound and ad targeting
are **blocked unless the relevant channel is currently opt-in** (GDPR / CAN-SPAM / TCPA).
Having data is not permission to message.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `contact_id` | uuid | FK → `contact` |
| `channel` | enum | email / sms / etc. |
| `state` | enum | opt_in / opt_out |
| `lawful_basis` | enum | consent / legitimate_interest / contract / public_data |
| `source` | text | where the event came from |
| `proof` | jsonb | evidence of the consent action |
| `recorded_by_user_id` | uuid | FK → `app_user` (nullable) |
| `occurred_at` | timestamptz | event time (ledger order) |

## Joins

- `contact_id` → `contact`. Derived: `current_consent` (the gate).
- Enforced by the approval-gated send path (ADR-0058) — consent re-asserted at execution.

## Notes

Consent facts are personal data. The ledger is **never updated or deleted** (that is the
compliance control). Keep row-level values out of this doc; resolve against the live
read-only DB.
