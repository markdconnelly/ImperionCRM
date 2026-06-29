# Stage 01 — gather-classify

**Job:** sweep the social-engagement store for new inbound items, classify each by
intent (lead | support | brand | spam), and tag sentiment + topic — each item cited
with its as-of (the 01-D classify pass + the 01-E listening sweep).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sweep window | trigger payload | this batch | which items are new since last sweep |
| Inbound items | `` `okf:social_engagement` `` | new DMs / comments / mentions | the items to triage + listen on |
| Conversation context | `` `okf:interaction` `` | the item's prior thread, if any | a DM is a thread, not a one-off |
| Author handle map | `` `okf:contact_social_identity` `` | the item's author handle | resolve author → contact (existing-customer check feeds stage 02) |
| Brand voice | `../../skills/brand-voice.md` | all | the topic/sentiment lens (domain-tier skill) |

## Process

1. `[script]` Resolve the sweep window; pull new `social_engagement` items since the
   last sweep. Dedupe against items already classified.
2. `[haiku]` For each item, classify intent — **lead | support | brand | spam** —
   via deterministic keyword classifier + cheap-model fallback; tag **sentiment +
   topic** (the 01-E listening pass). A dormant source (poll down / recall down) →
   **flag stale, never present dormant as live** (A5c).
3. `[script]` Resolve author handle → `contact` via `contact_social_identity`; stamp
   the match (or "anonymous") so stage 02 can apply the existing-customer guard.
   Anonymous chatter stays off Contact-360.

## Outputs

`triage-batch.md` — one row per item: the item ref + as-of, classified intent,
sentiment + topic tags, the author→contact match (or anonymous), and any stale-source
flag.

## Audit

- [ ] Each item cites its source ref + as-of (A5); none fabricated
- [ ] Every item carries an intent in {lead, support, brand, spam}
- [ ] Sentiment + topic tagged for every item (listening pass)
- [ ] Author→contact match resolved (or explicitly "anonymous")
- [ ] Dormant/stale source flagged, not presented as live
