# Stage 01 — ground

**Job:** assemble the grounded brief for one Social Post — voice, channel norms,
the linked campaign, recent performance, and the slot — each cited with its as-of.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The slot / request | trigger payload | the one post | what we're posting and when |
| Brand voice | `../../skills/brand-voice.md` | all | how we sound (domain-tier skill) |
| Channel norms | `./skills/channel-norms.md` | the target channels | hard format constraints |
| Linked campaign | `` `okf:campaign` `` | the slot's campaign | objective, theme, the angle to serve |
| Recent performance | `` `okf:social_metric` `` | this channel, recent window | what's landed lately |
| Calendar slot / draft | `` `okf:social_post` `` | the scheduled slot, if any | dedupe against an existing draft |

## Process

1. `[script]` Resolve the slot: target channel set, scheduled time, linked
   `campaign` id (if any). Dedupe against an existing `social_post` for the slot.
2. `[haiku]` Read recent `social_metric` for the channel(s); note what to lean into.
   A dormant/stale collector → flag stale, never present as live.
3. `[sonnet]` Write the brief: the objective, the angle, the audience, the key
   message — **cite each source + as-of**. If the brand room is empty/missing, **park**
   — never invent a voice or a claim.

## Outputs

`brief.md` — channel set, scheduled time, linked campaign id, the objective + angle +
audience + key message, and the cited sources (each with as-of).

## Audit

- [ ] Each grounded fact cites a source + as-of (A5); none fabricated
- [ ] Brand voice + channel norms loaded and reflected in the angle
- [ ] Linked campaign resolved (or explicitly "none — standalone")
- [ ] Not a duplicate of an existing post for the slot
- [ ] Empty/missing brand room → parked, not improvised
