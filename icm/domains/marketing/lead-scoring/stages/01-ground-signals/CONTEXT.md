# Stage 01 — ground-signals

**Job:** assemble the lead's scoring signals — fit (the contact/account profile) and
engagement (interactions, campaign touch) — each cited with its as-of.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The lead / re-score request | trigger payload | the one lead | which lead, and why it's being scored |
| Prior score | `` `okf:lead_score` `` | this lead | the score being recomputed (baseline + history) |
| Fit — contact profile | `` `okf:contact` `` | this lead's contact | who they are (role, source, consent) |
| Fit — account profile | `` `okf:account` `` | the contact's account, if mapped | firmographic fit (size, segment) |
| Engagement signals | `` `okf:interaction` `` | this lead, recent window | behavioral signal — opens, clicks, replies, visits |
| Campaign touch | `` `okf:campaign` `` | the lead's campaign touches | which campaign(s) engaged them; attribution context |

## Process

1. `[script]` Resolve the lead from the trigger payload; pull the prior `lead_score`
   as the baseline. Dedupe — one open score per lead.
2. `[haiku]` Read the fit signals (`contact` / `account` profile) and recent
   `interaction` + `campaign` touch for the lead; note what should move the score.
   A dormant/stale signal source → flag stale, never present as live.
3. `[sonnet]` Write the signal brief: the fit inputs, the engagement inputs, the
   campaign attribution — **cite each source + as-of**. **#389 predictive features are
   dormant → say so and ground on rules-only signals; never invent a signal.** Empty/
   missing signals for the lead → **park**.

## Outputs

`signals.md` — the lead id, the prior score baseline, the fit inputs, the engagement
inputs, the campaign touch, and the cited sources (each with as-of); a note that
scoring is rules-only (predictive dormant).

## Audit

- [ ] Each grounded signal cites a source + as-of (A5); none fabricated
- [ ] Fit (contact/account) and engagement (interaction/campaign) both grounded
- [ ] Prior `lead_score` baseline resolved
- [ ] Predictive dormancy (#389) stated → rules-only basis declared (A5c)
- [ ] Empty/missing signals → parked, not improvised
