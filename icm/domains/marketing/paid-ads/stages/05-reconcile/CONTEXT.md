# Stage 05 — reconcile

**Job:** reconcile the actuated spend and results to `campaign_metric` and close the run.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Actuate result | stage 04 output | all | what deployed/changed, with the Meta ad id |
| Metric store | `` `okf:campaign_metric` `` | this ad's campaign | where spend + paid results land |
| Performance store | `` `okf:social_metric` `` | this ad's channels | the boosted post's ongoing metrics |
| Ad record | `` `okf:ad` `` | this ad | the run to close |

## Process

1. `[script]` Register the live Meta ad id for spend + result collection so the next
   run's stage 01 grounds on real numbers (the collector hydrates async; this stage
   only registers the link, ADR-0124).
2. `[script]` Reconcile the committed spend + paid results to `campaign_metric`
   (organic ∪ paid attribution → 01-M). Stamp the run outcome on the `ad` (committed $,
   approver, as-of). Cross-client/account spend correlation stays internal/aggregated
   (A7 — pool, never bleed).
3. `[script]` Close the run.

## Outputs

`reconcile.md` — the registered metric link, the spend reconciled to `campaign_metric`,
the run outcome stamp (committed $, approver, as-of), and the close state.

## Audit

- [ ] Spend reconciled to `campaign_metric` (matches the committed amount)
- [ ] Metric link registered for the live Meta ad id
- [ ] Run outcome stamped (committed $, approver, as-of)
- [ ] No cross-client/account spend data bled into the record (internal/aggregated only)
