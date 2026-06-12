# ADR-0059: Defender incident ↔ Autotask ticket linkage as a dedicated link table

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted (2026-06-12, Mark's per-source review verdict: Defender incidents/alerts layer with Autotask data per incident) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0051 (posture model), #256, local-pipeline #138 (collector) |

## Problem

Defender XDR incidents land as bronze (`defender_incidents` / `defender_alerts`,
migration 0076) keyed by stable Graph ids. Each incident an MSP works gets an
Autotask ticket; the app must show them as one layered story per incident — and a
future sync-back ("create a ticket for this incident") must be loop-proof: re-seeing
the incident on the next poll, or re-ingesting the ticket it just created, must never
spawn a second ticket. Same caution as the tasks↔tickets item in the UI-review
backlog.

## Options considered

1. **Dedicated link table** `defender_incident_ticket_link` (this decision).
2. A nullable `autotask_ticket_external_id` column on `defender_incidents` bronze —
   rejected: bronze is lossless raw (0038 contract) and the collector's full-row
   upsert would clobber app/process-owned linkage state on every poll.
3. Infer the link by matching ticket titles/descriptions — rejected: silent
   mismatches, no idempotency guarantee, same reason ADR-0051 rejected domain-based
   tenant inference.

## Decision

A standalone table (migration 0076):
`defender_incident_ticket_link (tenant_id, incident_external_id PK, autotask_ticket_external_id NOT NULL, origin, linked_by, note)`.

- **The PK is the idempotency key.** One Autotask ticket per Defender incident.
  Any flow that creates a ticket records the link in the same unit of work via
  `INSERT … ON CONFLICT DO NOTHING`; an existing row means "ticket already exists —
  do not create another". That single invariant is what makes sync-back unloopable.
- Both sides are **external ids** (Graph incident id, Autotask ticket id), not FKs —
  bronze rows can arrive in any order from two independent collectors; the link must
  not depend on either side having landed first. Joins resolve through
  `defender_incidents.external_id` and `ticket.external_ref` / bronze
  `autotask_tickets.external_id` at read time.
- `origin` records who asserted the link (`defender_to_autotask` sync-back,
  `autotask_to_defender` back-reference, `manual`).
- Writers: on-prem collector (`imperion-localpipeline`, auto-link) and backend
  functions (`mgid-imperioncrmbackendfunction` — ticket creation is a *process*,
  ADR-0042). Pipeline + web read. No DELETE for anyone (0044 posture); unlinking is
  a future admin surface.

## Consequences

- Account pages can badge open Defender incidents (joined via `account_tenant`,
  ADR-0051) and later render the incident+ticket layered view from one join.
- The local collector (#138) lands incidents/alerts without knowing about tickets;
  linkage arrives independently.
- A one-incident-to-many-tickets need (rare) would require a deliberate PK change
  through a new ADR — the constraint is the safety feature, not an oversight.

## Security impact

Read paths are SELECT-only for the web role. Link writes are confined to the
identity-gated backend and the on-prem collector roles. No new secrets; no PII in
the link table beyond a linker UPN in `linked_by`.
