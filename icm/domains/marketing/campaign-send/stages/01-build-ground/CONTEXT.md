# Stage 01 — build-ground

**Job:** build one Campaign Send and resolve its audience/segment into a grounded
brief — copy, the linked campaign, the audience basis — each cited with its as-of, no
fabricated claim.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The schedule / journey step | trigger payload | the one send | what's being sent and when |
| Brand voice | `../../skills/brand-voice.md` | all | how we sound (domain-tier skill) |
| The send record | `` `okf:campaign_send` `` | the scheduled send | where the send + audience basis is staged |
| Linked campaign | `` `okf:campaign` `` | the send's campaign | objective, theme, the offer to serve |
| Audience members | `` `okf:contact` `` | the resolved segment | the recipient basis to size + ground |

## Process

1. `[script]` Resolve the send: scheduled time, linked `campaign` id, and the
   audience/segment → the `contact` recipient set. Dedupe the recipient list.
2. `[sonnet]` Build the send copy from the campaign + brand voice — on-brand, one offer,
   one CTA. Apply substantiation: every claim names a source + as-of, or is **cut/softened**.
   No fabricated stat, timeline, or price. A claim that cannot be sourced → **park**.
3. `[script]` Classify the audience basis: **known/established** (an existing segment
   sent to before, within frequency norms) vs **new/materially-larger** (a fresh or
   materially expanded list) — this descriptor feeds the stage-03 gate. Empty/missing
   brand room → **park**, never invent copy.

## Outputs

`brief.md` — scheduled time, linked campaign id, the built copy, the substantiation
reference per claim, the resolved recipient basis (counts only), and the audience
descriptor (known/established | new/large — feeds the stage-03 gate), with cited
sources (each with as-of).

## Audit

- [ ] Each grounded fact cites a source + as-of (A5); none fabricated
- [ ] Every claim has a substantiation reference + as-of, or was cut (no fabrication)
- [ ] One CTA per send; on-brand; linked campaign resolved (or "none — standalone")
- [ ] Audience descriptor stated (known/established | new/large) for the gate
- [ ] Empty/missing brand room → parked, not improvised
- [ ] No client identity / confidential data in the copy
