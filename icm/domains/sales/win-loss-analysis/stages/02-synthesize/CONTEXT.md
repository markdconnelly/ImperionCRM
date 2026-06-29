# Stage 02 — synthesize

**Job:** synthesize the win/loss patterns by segment, competitor, and source from the gathered
cohort, with any cross-deal correlation pooled across the deal base internally only —
anonymized and aggregated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gathered cohort | stage 01 output | the cohort | the cited outcome + reason + attribution base |
| Closed opportunities | `` `okf:opportunity` `` | the cohort | the outcome/reason detail behind each pattern |
| Owning accounts | `` `okf:account` `` | accounts in the cohort | segment cut for the pattern breakdown |
| Source campaigns | `` `okf:campaign` `` | attributed campaigns | source/demand cut for the pattern breakdown |

## Process

1. `[script]` Aggregate outcomes by segment (`account`), competitor, and source (`campaign`):
   win rate, loss rate, and reason mix per cut; carry each source's as-of forward.
2. `[sonnet]` Synthesize the win/loss patterns — why deals close or slip by segment/competitor/
   source (recurring loss-on-price, loss-on-demand, competitor-displacement). Cite the
   contributing opportunities; a cut with no clean source stays uncomputed and is noted, not
   invented (A5).
3. `[script]` Build any cross-deal correlation **pooled across the deal base internally only —
   anonymized + aggregated** (A7): no client identifier, no row-level personal data, no single
   client's specifics bleeding into another's view. **Pool, never bleed.**

## Outputs

`synthesis.md` — the win/loss patterns by segment/competitor/source (win/loss rates + reason
mix) with cited opportunities, and any anonymized/aggregated cross-deal correlation.

## Audit

- [ ] Patterns cut by segment + competitor + source; rates + reason mix computed
- [ ] Each pattern cites its contributing opportunities (A5); none fabricated
- [ ] Cross-deal correlation anonymized + aggregated only — no client identifier / no bleed (A7)
