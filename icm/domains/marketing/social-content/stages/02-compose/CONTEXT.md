# Stage 02 — compose

**Job:** author one composition and its per-network adaptations, every claim
substantiated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 01 output | all | objective, angle, audience, message |
| Brand voice | `../../skills/brand-voice.md` | all | tone (domain-tier skill) |
| Channel norms | `./skills/channel-norms.md` | the brief's channels | length/format/link rules |
| Substantiation rules | `./skills/substantiation-rules.md` | all | cite-or-cut |
| Post record | `` `okf:social_post` `` | the draft being written | where the composition is staged |
| Channel rows | `` `okf:social_post_channel` `` | the brief's channels | the fan-out targets to adapt for |

## Process

1. `[sonnet]` Write the **single composition** from the brief — on-brand, one idea,
   one CTA. Front-load the hook.
2. `[sonnet]` For each target channel, **adapt** the composition per
   `channel-norms.md` (length, links, hashtags, media) — adapt, don't duplicate.
3. `[sonnet]` Run `substantiation-rules.md` over every claim: name a source + as-of,
   or **cut/soften**. No fabricated stat, testimonial, quote, capability, or scarcity.
   A claim that cannot be sourced → **park** (do not ship the draft).
4. `[script]` Stage the composition on the `social_post` and one
   `social_post_channel` row per target channel (internal, reversible — L2).

## Outputs

`composition.md` — the single composition, the per-channel adaptations, the
substantiation reference for each claim, and the audience descriptor (established vs
new/large — feeds the stage-03 gate).

## Audit

- [ ] Every claim has a substantiation reference + as-of, or was cut (no fabrication)
- [ ] One CTA per post; on-brand; channel constraints met (length/links/media/alt-text)
- [ ] Adaptations differ per channel — not a copy-paste
- [ ] Audience descriptor stated (established | new/large) for the gate
- [ ] No client identity / confidential data in public copy
