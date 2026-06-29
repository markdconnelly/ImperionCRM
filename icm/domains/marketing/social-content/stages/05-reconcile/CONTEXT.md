# Stage 05 — reconcile

**Job:** back-sync the published post's early metrics and close the run.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Dispatch result | stage 04 output | all | what published, with external ids |
| Metric store | `` `okf:social_metric` `` | this post's channels | where performance lands |
| Post record | `` `okf:social_post` `` | this post | the run to close |

## Process

1. `[script]` Register the published external post ids for metric collection so the
   next run's stage 01 grounds on real numbers (the collector hydrates async; this
   stage only registers the link, ADR-0124).
2. `[script]` Stamp the run outcome on the `social_post` (published channels, approver,
   as-of). Cross-post performance correlation stays internal/aggregated (A7 — pool,
   never bleed).
3. `[script]` Close the run.

## Outputs

`reconcile.md` — the registered metric links, the run outcome stamp, and the close
state.

## Audit

- [ ] Metric links registered for every published channel
- [ ] Run outcome stamped (channels, approver, as-of)
- [ ] No cross-client/audience data bled into the record (internal/aggregated only)
