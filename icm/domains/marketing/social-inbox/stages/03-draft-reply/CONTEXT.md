# Stage 03 — draft-reply

**Job:** for brand items only, author the on-brand reply — substantiated, in voice,
with no fabricated claim or capability.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brand items | stage 02 output | the brand-keep subset | what's ours to answer |
| Engagement item | `` `okf:social_engagement` `` | each brand item | the comment/DM being answered |
| Thread context | `` `okf:interaction` `` | the item's prior thread | reply in-context, not cold |
| Brand voice | `../../skills/brand-voice.md` | all | how we sound (domain-tier skill) |

## Process

1. `[haiku]` Read the item + its thread context; identify what's actually being
   asked or said.
2. `[sonnet]` Draft the per-channel reply **in brand voice** — polished,
   unmistakably human, channel-appropriate. **Every claim carries a real source or
   it gets cut** — no fabricated stat, testimonial, quote, or capability
   (brand-voice.md). No impersonation.
3. `[script]` Mark the reply's class — **templated non-committal ack** vs
   **free-text** — so stage 04 can apply the right ceiling.

## Outputs

`draft-reply.md` — per brand item: the drafted reply text, its channel, its class
(templated-ack | free-text), and the substantiation ref for any claim it makes.

## Audit

- [ ] Reply drafted only for `brand`-intent items (nothing routed away)
- [ ] Every claim carries a substantiation ref; unsourced claims cut, not invented
- [ ] No fabricated quote, testimonial, capability, or impersonation
- [ ] Reply is in brand voice + channel-appropriate
- [ ] Reply class marked (templated-ack | free-text) for the send gate
