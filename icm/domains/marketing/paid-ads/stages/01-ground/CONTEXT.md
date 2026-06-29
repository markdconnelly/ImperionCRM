# Stage 01 — ground

**Job:** assemble the grounded paid brief — the post's/ad's Social Metrics and the
linked campaign's target vs spend pace — each cited with its as-of.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The trigger | trigger payload | the one post / ad | what we're boosting or re-budgeting, and which path (01-B boost / 01-C change) |
| Source post (boost path) | `` `okf:social_post` `` | the post to amplify | the published post reused as creative |
| Live ad (change path) | `` `okf:ad` `` | the live ad | current budget, state, spend pace |
| Recent performance | `` `okf:social_metric` `` | this post/ad's channels, recent window | CPL, results, what's landing — the case for the action |
| Linked campaign target | `` `okf:campaign` `` | the parent campaign | the target CPL / budget envelope to measure against |

## Process

1. `[script]` Resolve the trigger: the path (boost 01-B vs budget-change 01-C), the
   target post or `ad` id, the linked `campaign` id.
2. `[haiku]` Read recent `social_metric` for the post/ad: results, CPL, spend pace.
   A dormant/stale collector → **flag stale, never present as live** (A5c).
3. `[sonnet]` Write the paid brief: current performance vs the campaign target/envelope,
   the spend pace, and the case for an action — **cite each source + as-of**. If the
   metric room is empty/missing, **park** — never guess a number or a budget.

## Outputs

`paid-brief.md` — the path (boost | change), the target post/ad id, the linked campaign
id + target, the current performance (CPL, results, spend pace), and the cited sources
(each with as-of).

## Audit

- [ ] Each grounded fact cites a source + as-of (A5); none fabricated
- [ ] Path resolved (boost 01-B | budget-change 01-C)
- [ ] Linked campaign + target/envelope resolved (or explicitly "none")
- [ ] Dormant/stale collector flagged stale, not presented as live
- [ ] Empty/missing metric room → parked, not guessed
