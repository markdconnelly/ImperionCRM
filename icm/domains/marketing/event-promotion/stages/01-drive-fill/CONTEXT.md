# Stage 01 — drive-fill

**Job:** plan and schedule the fill activities for one event — the campaigns,
Campaign Sends, and organic posts — delegating every actuation to its sub-procedure.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The event | trigger payload | the one event | start time, theme, fill target (orchestration metadata — Planned-Connector dep, not a room) |
| Linked campaign | `` `okf:campaign` `` | the event's campaign | objective, theme, the angle to serve |
| Scheduled sends | `` `okf:campaign_send` `` | this campaign | existing/planned sends to dedupe against |
| Planned posts | `` `okf:social_post` `` | this campaign | existing/planned posts to dedupe against |
| Brand voice | `../../skills/brand-voice.md` | all | how we sound (domain-tier skill) |

## Process

1. `[script]` Resolve the event: start time, fill target, linked `campaign` id. Read
   existing `campaign_send` / `social_post` for the campaign to avoid double-scheduling.
2. `[sonnet]` Plan the fill: which Campaign Sends (→ campaign-send) and which organic
   posts (→ social-content), at which lead times before the event — **cite the campaign +
   as-of**. Empty/missing campaign room → **park**, never invent an event angle.
3. `[script]` Schedule the fill activities as sub-procedure invocations (campaign-send /
   social-content), each tagged with the event + campaign attribution. **You schedule;
   each send/post actuates through its own procedure's gate** — this stage never sends.

## Outputs

`fill-plan.md` — the linked campaign id, the scheduled fill activities (sends → campaign-send,
posts → social-content) with their lead times, and the cited sources (each with as-of).

## Audit

- [ ] Each grounded fact cites a source + as-of (A5); none fabricated
- [ ] Linked campaign resolved (or explicitly "none — standalone event")
- [ ] No fill activity duplicates an existing send/post for the campaign
- [ ] Every fill activity routed to its sub-procedure (campaign-send / social-content) — none actuated here
- [ ] Empty/missing campaign room → parked, not improvised

## Autonomy

No checkpoint of its own. Planning + scheduling is internal/reversible — auto at **L2**
under `auto`. Each scheduled send gates inside **campaign-send**, each post inside
**social-content**; nothing outbound is committed in this stage.
