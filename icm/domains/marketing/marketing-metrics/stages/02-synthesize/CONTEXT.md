# Stage 02 — synthesize

**Job:** union organic ∪ paid into one marketing picture and compute multi-touch
attribution over touch → opportunity → won, with any cross-client benchmark anonymized and
aggregated only.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gathered readings | stage 01 output | the window | the normalized, cited metric base |
| Social Metrics | `` `okf:social_metric` `` | the window | organic side of the union |
| Campaign performance | `` `okf:campaign_metric` `` | the window | paid side of the union + spend |
| Campaign spine | `` `okf:campaign` `` | in-scope campaigns | attribution grouping (touch → campaign) |

## Process

1. `[script]` Union organic (`social_metric`) ∪ paid (`campaign_metric`) into one marketing
   result set, keyed by campaign + channel; carry each source's as-of forward.
2. `[sonnet]` Compute multi-touch attribution over touch → opportunity → won (#1316):
   sourced/influenced pipeline vs spend, CPL, CAC, ROAS. Cite the contributing touches; a
   metric with no clean source stays uncomputed and is noted, not invented (A5).
3. `[script]` Build any cross-client benchmark **anonymized + aggregated only — pool, never
   bleed** (A7): no client identifier, no row-level personal data, no single-client figure
   leaves the aggregate.

## Outputs

`synthesis.md` — the unioned organic ∪ paid result set, the multi-touch attribution figures
(CPL / CAC / ROAS / sourced + influenced pipeline) with cited touches, and any anonymized
aggregate benchmark.

## Audit

- [ ] Organic ∪ paid unioned without double-counting; as-of carried forward
- [ ] Attribution figures cite their contributing touches (A5); none fabricated
- [ ] Any benchmark anonymized + aggregated only — no client identifier / no bleed (A7)
