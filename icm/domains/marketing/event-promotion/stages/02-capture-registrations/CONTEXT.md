# Stage 02 — capture-registrations

**Job:** route each incoming event registration through the capture inbox so it lands
as a normalized, consent-captured contact via lead-capture.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Registrations | trigger payload | this event's new registrations | who registered (orchestration metadata — Planned-Connector dep, not a room) |
| Contact kernel | `` `okf:contact` `` | matched contacts | dedupe / resolve owner against existing contacts |
| Consent state | `` `okf:consent_event` `` | each registrant | consent captured at registration, for downstream sends |

## Process

1. `[script]` For each new registration, assemble the capture payload (source = this
   event, campaign touch, consent state) and hand it to **lead-capture** (01-F) through
   the capture inbox. Registrations are read back via lead-capture, never a direct event
   read.
2. `[haiku]` Confirm each registration resolved to a `contact` (dedupe / owner-resolution
   is lead-capture's job; this stage only verifies the round-trip), **citing the source
   registration + as-of**.
3. `[script]` Record the captured registrant set on the run for the clock and follow-up
   stages. Existing-customer registrants follow lead-capture's customer rule (not treated
   as new leads).

## Outputs

`registrations.md` — the captured registrant set (each linked to its `contact`, with
consent state + as-of), and any unresolved registrations flagged for spot-check.

## Audit

- [ ] Each registration routed through lead-capture (none captured directly here)
- [ ] Each grounded fact cites a source + as-of (A5); none fabricated
- [ ] Consent state captured per registrant for downstream sends
- [ ] No cross-client/audience data bled into the record (internal/aggregated only, A7)

## Autonomy

No checkpoint of its own. The capture writes are internal/reversible and owned by
**lead-capture** (auto at L2 there); this stage only routes and verifies — nothing
outbound is committed.
