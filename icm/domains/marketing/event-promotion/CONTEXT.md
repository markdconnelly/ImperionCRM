# Workflow: event-promotion (marketing v1)

**Job:** run a scheduled event/webinar to a full house and a warm follow-up —
drive registrations, then **watch the event-start clock** and fire reminders on the
right lead times, then enroll attendees and no-shows into post-event nurture. This is
a **B9 deadline-sentinel**: it watches a deadline and drives fill through the OTHER
procedures; it owns no send path of its own. (Stream 01-K; ADR-0136 B9.)

**Trigger:** an event/webinar is scheduled (an event record exists with a start time).
One run per event lifecycle.

**It ORCHESTRATES — it does not duplicate.** Every actuation is a sub-procedure's act,
carrying that sub-procedure's gate:

- **fill sends → campaign-send** (01-I) · **fill posts → social-content** (01-A)
- **registrations → lead-capture** (01-F, via the capture inbox)
- **reminder sends → campaign-send** (01-I — each reminder rides the send gate)
- **post-event follow-up → nurture-journey** (01-H)

This workflow carries its **own gates only via those** sub-procedures. The event record
itself is **orchestration metadata** — a Planned-Connector dependency (event-platform),
not an OKF room; registrations are read back through lead-capture, never a direct
event-room read.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | drive-fill | Plan + schedule campaigns/sends/posts for fill — actuation delegated to the sub-procedures | — |
| 02 | capture-registrations | Route each registration through the capture inbox → lead-capture | — |
| 03 | watch-clock | B9: fire reminder Campaign Sends relative to the event-start time — each via campaign-send's gate | — |
| 04 | post-event | Enroll attendees/no-shows into post-event nurture → nurture-journey | — |

## Autonomy

Starts `draft` (ADR-0061). The orchestrator's own acts are **internal planning and
scheduling** of fill activities — auto at **L2** when an admin flips to `auto`
(reversible internal step-records, ADR-0128 / ADR-0136 A10 row 1). It has **no
checkpoint of its own**: every actual outbound inherits the gate of the sub-procedure
that owns the act. A **send** inherits the campaign-send gate — a routine
known-audience send may reach **L3**, a **large/new-audience blast is `always_gate`**;
a **post** inherits the social-content gate. **Reminder sends fire on the event clock,
but each send still passes its gate** — the sentinel pre-stages the easy-button, it
never auto-fires a client send (A11). **Money never enters this workflow** — a boost/ad
is a separate procedure (01-B/01-C), `always_gate`.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `brand-voice.md` (every marketing draft sounds the
same). Mark-editable business content; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed workflow
prose is `prose.md`.
