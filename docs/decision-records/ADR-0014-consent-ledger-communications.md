---
adr: 0014
title: "Append-only consent ledger and communications"
status: accepted
date: 2026-06-07
repo: frontend
summary: "An immutable `consent_event` ledger per contact × channel; outbound sends are blocked unless consent is current."
tags: [crm-core]
---
# ADR-0014: Append-only consent ledger and communications

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

Model consent and outbound communications (email/SMS, call recording) so the system
is defensible under TCPA/CAN-SPAM/GDPR and won't send to a contact who hasn't
consented.

## Context

Sales texts contacts, records calls (Plaud), and runs nurture sequences. Consent is
a legal control, not a UI preference; disputes require an auditable history of when
and how consent was given or withdrawn.

## Options considered

1. **Append-only consent ledger**, current status derived; sends gated on it.
2. Boolean opt-in flags per channel on the contact.

### Tradeoffs

- (1) immutable evidence (who/when/proof/source) per contact × channel; current
  consent is computed; defensible. Slightly more query work.
- (2) trivial but no history — indefensible in a dispute and likely re-migrated into
  a ledger later.

## Decision

Adopt the **`consent_event` ledger**: per contact × channel (`email`, `sms`,
`call_recording`), each opt-in/opt-out is an immutable row with timestamp, source,
and proof. Current consent is derived; **outbound sends are blocked unless consent
is current.** Messages are logged to the `interaction` timeline (ADR-0011). Nurture
is modeled in-app as `workflow` + `workflow_step` + `workflow_enrollment`; **Power
Automate only fires the actual send/notify** (CLAUDE.md §3 — no core logic in Power
Automate).

## Consequences

### Security impact

Consent records are PII-adjacent and audit-logged; the ledger is append-only (no
updates/deletes) to preserve evidentiary value.

### Cost impact

SMS/email provider usage; negligible storage.

### Operational impact

A send-time consent check is mandatory in the send path. Honor opt-out immediately
(stop enrollments). Jurisdiction-specific rules are an open item.

## Future considerations

Double opt-in flows; per-jurisdiction policy; preference center for contacts.
