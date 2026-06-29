# Stage 04 — send-log

**Job:** fire the approved send idempotently, read back delivery, and reconcile
attribution into Campaign Metrics.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Approved send | stage 03 output | all | the human-approved send action |
| Consented list | stage 02 output | all | the consent-clean recipient basis to fire to |
| The send record | `` `okf:campaign_send` `` | this send | the status to advance |
| Metric store | `` `okf:campaign_metric` `` | this send | where delivery + performance lands |

## Process

1. `[script]` Fire via the backend send path (`send.email`, ADR-0058 backend-only) to
   the consented list, **idempotency-keyed (campaign_send + period) so a replay is a
   no-op** — never a double-send (A9b).
2. `[script]` **Read back** delivery (accepted / bounced / deferred per the provider)
   before advancing (A9c); record it on the `campaign_send` row. A failed/partial fire
   is recorded as such, never presented as delivered.
3. `[script]` Advance the `campaign_send` to **Delivered** (or **Partially-delivered**),
   and register the send for metric collection so the next run grounds on real numbers.
4. `[script]` Reconcile delivery/open/click attribution into `campaign_metric` (collector
   hydrates async; this stage registers the link → 01-M). Cross-audience performance
   correlation stays internal/aggregated (A7 — pool, never bleed). Close the run.

## Outputs

`send-log.md` — the delivery result (delivered | partial | failed, with accepted/bounced
counts), the resulting `campaign_send` status, the registered metric links, and the
close state.

## Audit

- [ ] The fire is idempotency-keyed (a replay is a no-op, never a double-send)
- [ ] Delivery read back before close (no assume-success)
- [ ] `campaign_send` status reflects the true delivery outcome; failures not hidden
- [ ] Metric links registered; attribution reconciled to `campaign_metric`
- [ ] No cross-audience/client data bled into the record (internal/aggregated only)
