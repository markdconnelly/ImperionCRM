# Stage 04 — dispatch

**Job:** publish the approved post per channel, idempotently, and read back the
status.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Approved publish | stage 03 output | all | the human-approved per-channel actions |
| Channel rows | `` `okf:social_post_channel` `` | this post's channels | the dispatch targets + external refs |
| Post record | `` `okf:social_post` `` | this post | the status to advance |

## Process

1. `[script]` For each approved channel, dispatch via the per-network adapter
   (`social_dispatch`, ADR-0124), **idempotency-keyed so a retry is a no-op** (A9b).
   A channel with a dormant/missing token is **skipped and flagged**, never silently
   dropped.
2. `[script]` **Read back** the publish status + external post id per channel before
   advancing (A9c); record it on the `social_post_channel` row.
3. `[script]` Advance the `social_post` to **Published** (or **Partially-published**
   if a channel was dormant), with the per-channel result.

## Outputs

`dispatch-result.md` — per-channel: published | skipped-dormant | failed, the external
post id where published, and the resulting `social_post` status.

## Audit

- [ ] Every dispatch is idempotency-keyed (a retry is a no-op)
- [ ] Status read back per channel before close (no assume-success)
- [ ] Dormant/failed channels flagged, not presented as published
- [ ] `social_post` status reflects the true per-channel outcome
