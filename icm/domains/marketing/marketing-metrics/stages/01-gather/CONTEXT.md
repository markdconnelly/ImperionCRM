# Stage 01 — gather

**Job:** ingest and normalize the marketing metric substrate — Social Metrics +
`campaign_metric` — each cited with its source and as-of, with a dormant collector flagged
stale rather than presented as live.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The refresh / request | trigger payload | the reporting window | what window + scope to report |
| Social Metrics | `` `okf:social_metric` `` | the window, all marketing channels | organic performance (per post/channel) |
| Campaign performance | `` `okf:campaign_metric` `` | the window, active campaigns | paid + send/journey/event results |
| Linked campaigns | `` `okf:campaign` `` | the campaigns in scope | the rollup spine + attribution touch grouping |

## Process

1. `[script]` Resolve the reporting window + scope from the trigger; enumerate the
   in-scope `campaign` ids for the rollup.
2. `[script]` Pull `social_metric` + `campaign_metric` for the window. Normalize metric
   names (#135) so the same number reads the same everywhere; key each reading to its source.
3. `[haiku]` Stamp each metric source with its **as-of**; a dormant/down collector (stale
   as-of, no fresh rows) → **flag stale, never present as live** (A5c). No fabricated reading.

## Outputs

`gathered.md` — the normalized `social_metric` + `campaign_metric` readings keyed to their
source + as-of, the in-scope campaign ids, and any stale-collector flags.

## Audit

- [ ] Each metric reading cites a source + as-of (A5); none fabricated
- [ ] Metric names normalized (#135) — consistent across sources
- [ ] Dormant/stale collector flagged stale, not presented as live (A5c)
- [ ] In-scope campaign ids resolved for the rollup
