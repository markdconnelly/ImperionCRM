# Stage 05 — dispatch-log

**Job:** dispatch the approved reply per network idempotently, attach it to its
Contact, read back the status, and log the timeline.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Approved reply | stage 04 output | the approved replies | what to send, with the consent basis |
| Author handle map | `` `okf:contact_social_identity` `` | the reply's author handle | attach the reply to a Contact on match |
| Interaction timeline | `` `okf:interaction` `` | the reply's thread | where the sent reply lands |
| Engagement item | `` `okf:social_engagement` `` | the answered item | stamp the item as replied + read-back |

## Process

1. `[script]` Send the reply via the per-network adapter, **idempotency-keyed
   (item + channel) so a retry is a no-op, never a double-send** (A9b).
2. `[script]` Attach the reply to its `contact` on author match (via
   `contact_social_identity`); leave anonymous chatter off Contact-360.
3. `[script]` **Read back** the send status (A9c); stamp the `social_engagement`
   item as replied (approver, as-of) and write the reply to the `interaction`
   timeline. Roll the listening sentiment/volume into `social_metric` (→ 01-M).

## Outputs

`dispatch.md` — per reply: the per-channel send status (read-back confirmed), the
Contact attachment (or anonymous), the timeline-log ref, and the close state.

## Audit

- [ ] Send idempotency-keyed; a replay is a no-op (no double-send)
- [ ] Send status read back before close (A9c)
- [ ] Reply attached to Contact on match (anonymous left off Contact-360)
- [ ] Timeline logged + item stamped replied (approver, as-of)
- [ ] No cross-client/audience data bled into the record (internal/aggregated only)
