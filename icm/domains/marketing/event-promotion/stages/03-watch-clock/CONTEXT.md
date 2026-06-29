# Stage 03 — watch-clock

**Job:** watch the event-start clock and fire reminder Campaign Sends at the right lead
times — each through campaign-send's gate, never auto-fired here (B9).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The event clock | trigger payload | this event's start time + reminder lead times | when reminders are due (orchestration metadata — Planned-Connector dep, not a room) |
| Linked campaign | `` `okf:campaign` `` | the event's campaign | the reminder's theme/attribution |
| Reminder sends | `` `okf:campaign_send` `` | this campaign | the reminder sends to schedule/dedupe |
| Registrant consent | `` `okf:consent_event` `` | registered audience | consent for the reminder recipients |

## Process

1. `[script]` Compute the due reminder lead times relative to the event-start time
   (cadence/date math); for each due reminder, dedupe against an existing
   `campaign_send`. **Cite the event date + as-of.**
2. `[sonnet]` Draft each reminder's angle from the linked `campaign` + brand voice — no
   fabricated claim/timeline (A5/B7).
3. `[script]` On each due lead time, hand the reminder to **campaign-send** (01-I) as a
   pre-staged easy-button. **The send rides campaign-send's gate** — a routine
   known-audience reminder may reach L3, a large/new-audience reminder is `always_gate`.
   The sentinel pre-stages; it never auto-fires a client send (A11).

## Outputs

`reminders.md` — the computed reminder schedule (each lead time relative to event start),
the drafted reminder angles, and the campaign-send hand-offs (each with its gate noted),
cited to the event date + as-of.

## Audit

- [ ] Each grounded fact cites a source + as-of (A5); none fabricated
- [ ] Reminder lead times computed relative to the event-start time
- [ ] No reminder duplicates an existing send for the campaign
- [ ] Every reminder routed to campaign-send's gate — none auto-fired in this stage (A11)

## Autonomy

No checkpoint of its own. Computing and scheduling the reminders is internal/reversible —
auto at **L2**. Each reminder **send** gates inside **campaign-send** (routine
known-audience → L3; large/new-audience blast → `always_gate`); the clock fires the
schedule, the gate fires the send.
