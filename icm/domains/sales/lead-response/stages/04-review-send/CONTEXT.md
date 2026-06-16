# Stage 04 — review-send  ·  CHECKPOINT

**Job:** get the draft approved (human or, where allowed, auto), then send it
through the ADR-0058 path and log it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Draft | stage 03 `draft.md` | all | the thing being approved |
| Triage | stage 01 `triage.md` | intent class, consent basis | autonomy + consent gates |

## Checkpoint

The approval item shows: draft, rationale, triage class, fit score, consent
basis. Approver may edit the body before approving; edits are kept as the sent
version and recorded.

**`auto` mode may self-approve ONLY when ALL hold** (Layer-1 contract):
intent = `standard-inquiry` · channel = email · stage-03 audit fully green ·
consent basis ≠ `none`. Everything else parks for a human in every mode —
including all DM replies and all nurture enrollments in v1.

## Process

1. Park until approved (or auto-approve per above).
2. Send via the ADR-0058 approval-gated path — consent re-asserted at
   execution, sender = shared sales mailbox (email) or page identity (DM).
   **No other send route exists for this workflow.**
3. `[haiku]` Log to the `interaction` timeline: sent body, channel, approver
   (human id or `auto`), run id.

## Outputs

`send-record.md` — sent version, timestamp, approver, send-path result.
Rejection ends the run with the rejection reason captured.

## Audit

- [ ] Approver identity recorded (never blank; `auto` only if all gates held)
- [ ] Consent re-assertion result logged
- [ ] Timeline entry id present
