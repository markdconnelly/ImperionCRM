# Stage 01 — gather

**Job:** gather the closed-won/lost outcome cohort — each opportunity's outcome, close reason,
and competitor/source attribution — cited with its source and as-of, with a dormant source
flagged stale rather than presented as live.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The schedule / cohort trigger | trigger payload | the closed period / cohort | what cohort + window to analyze |
| Closed opportunities | `` `okf:opportunity` `` | `won`/`lost` in the cohort | the outcome + close reason + competitor/source attribution |
| Owning accounts | `` `okf:account` `` | accounts on the cohort opportunities | segment grouping for the win/loss cut |
| Source campaigns | `` `okf:campaign` `` | campaigns attributed to the cohort | the source/demand attribution per deal |

## Process

1. `[script]` Resolve the cohort + window from the trigger; enumerate the in-scope `won`/`lost`
   `opportunity` ids and their owning `account` + attributed `campaign`.
2. `[script]` Pull each opportunity's outcome, close reason, and competitor/source attribution;
   key each reading to its `opportunity` id. Group by account segment + source campaign.
3. `[haiku]` Stamp each source with its **as-of** (A5); a dormant/empty source (no fresh closed
   cohort, stale feed) → **flag stale, never present as live** (A5c). No fabricated outcome or
   reason.

## Outputs

`gathered.md` — the closed-won/lost cohort keyed to each `opportunity` + as-of, with close
reason + competitor/source attribution, the segment + source groupings, and any stale-source flags.

## Audit

- [ ] Each outcome + reason cites its `opportunity` + as-of (A5); none fabricated
- [ ] Competitor/source attribution captured per deal; grouped by segment + source
- [ ] Dormant/empty source flagged stale, not presented as live (A5c)
- [ ] In-scope cohort ids resolved for the synthesis
