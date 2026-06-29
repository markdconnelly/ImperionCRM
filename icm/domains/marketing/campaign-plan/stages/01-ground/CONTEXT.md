# Stage 01 — ground

**Job:** assemble the grounded basis for one campaign plan — the goal, prior
performance, and the budget context — each cited with its as-of.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The brief / request | trigger payload | the one campaign | the goal, the push, the launch date |
| Brand voice | `../../skills/brand-voice.md` | all | how the message must sound (domain-tier skill) |
| Campaign record | `` `okf:campaign` `` | the campaign, if any | objective, theme, any prior plan to extend |
| Prior performance | `` `okf:social_metric` `` | this brand/channels, recent window | what's landed lately — the basis for channel mix |
| Budget context | `` `okf:ad` `` | prior/related ad spend | what paid has cost + delivered (envelope basis only) |

## Process

1. `[script]` Resolve the brief: the campaign goal, the launch date (the B9 clock),
   any existing `campaign` to extend. Dedupe against an existing plan for the goal.
2. `[haiku]` Read recent `social_metric` for the brand/channels; note what to lean
   into. A dormant/stale collector → flag stale, never present as live (A5c).
3. `[haiku]` Read the budget context from prior `ad` rows (spend + delivery) — as the
   **envelope basis only**; this stage reads, it never commits or implies a spend.
4. `[sonnet]` Write the grounded basis: the goal, the audience read, the performance
   read, the budget read — **cite each source + as-of**. If the brand room is
   empty/missing, **park** — never invent a voice or a claim.

## Outputs

`basis.md` — the campaign goal, the launch date, the linked campaign id (if any), the
performance read, the budget read, and the cited sources (each with as-of).

## Audit

- [ ] Each grounded fact cites a source + as-of (A5); none fabricated
- [ ] Brand voice loaded and reflected in the read
- [ ] Prior performance read (or explicitly "none — cold start")
- [ ] Budget context read as envelope basis only — no spend implied
- [ ] Empty/missing brand room → parked, not improvised
