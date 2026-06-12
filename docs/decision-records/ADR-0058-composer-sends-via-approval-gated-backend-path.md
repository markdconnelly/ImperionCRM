# ADR-0058: Composer 1:1 sends execute via the backend's approval-gated send path

| Field | Value |
|---|---|
| **Repo** | frontend (issue #183; backend contract = backend ADR-0033 + `POST /agent/actions/execute`) |
| **Status** | Accepted (2026-06-11) |
| **Date** | 2026-06-11 |
| **Cross-references** | ADR-0014 (consent gate), ADR-0042 (processes go through the backend), ADR-0055 (T2 propose-only), backend ADR-0033 (approval-gated actions), #190 call-guard seam |

## Context

The contact composer logged "sends" to the timeline — a deliberate stub. The backend now
has a real, consent-gated send layer (Graph `sendMail` as the owning employee's M365
mailbox; ACS for SMS), but exposes it through exactly ONE route:
`POST /agent/actions/execute`, which demands an explicit human approver and re-asserts
`current_consent` at execution. There is no separate "plain send" endpoint, and the
`commsService /send` placeholder was never built.

## Decision

**Composer sends reuse the approval-gated execute path rather than adding a second send
endpoint.** The composing human is both proposer and approver — submitting the composer
IS the approval (`approvedByUserId` = the acting user via the shared resolver, ADR-0055
T2 propose-only). One send path means one consent gate, one audit shape, one timeline
writer.

Frontend mechanics (`sendMessageAction`):
1. Pre-check consent for the UI; the backend's gate remains authoritative (its 403
   `consent_denied` renders as the blocked notice).
2. Resolve the recipient from the contact profile (email/phone per channel) and the
   sender's own active `m365` connection for email (SMS needs none — ACS).
3. Call through the #190 call-guard seam. Backend **unconfigured** (or missing
   prerequisites: no address, no M365 connection, no resolvable app user) → degrade to
   the previous logged-to-timeline stub with an HONEST notice saying it was logged, not
   delivered, and why. A **failed real attempt never falls back to the stub** — faking
   success would corrupt the timeline; it surfaces an error notice instead.

(Rejected: a dedicated `/comms/send` backend route — a second consent-gated send path to
keep in lockstep, for zero capability gain; silent stub fallback on real failures —
violates the timeline-as-evidence invariant.)

## Security impact

Strengthens the invariant: ALL outbound now flows through the single backend choke point
that re-asserts consent and audits approver + execution (backend writes `send.email` /
`send.sms` + `agent.action.execute` audit rows). The web app still holds no provider
credential — email sends use the employee's own Key-Vault-custodied M365 token; SMS uses
the backend's ACS secret.

## Cost / operational impact

None beyond the provider sends themselves. Activation is config: `AGENT_SERVICE_URL`
(already set where the orchestrator is live) + the employee's M365 connection for email;
`ACS_CONNECTION_SECRET`/`ACS_SMS_FROM` on the backend for SMS.
