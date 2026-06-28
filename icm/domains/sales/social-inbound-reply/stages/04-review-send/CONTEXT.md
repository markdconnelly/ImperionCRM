# Stage 04 — review-send

**Job:** a human approves or edits the draft; the approved reply is sent through the
ADR-0058 path.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Draft | `draft.md` (stage 03 output) | full | what may be sent |
| Consent / window | consent ledger · `okf:consent_event` | this author | re-assert basis at send |

## Process

1. `[script]` Re-check the consent ledger + the channel window at send time (a stop that
   arrived after stage 01, or a window that expired since drafting, blocks the send).
2. **Checkpoint** — present the draft + rationale to a human. They approve, edit, or reject.
3. `[send.dm]` On approval, send via the ADR-0058 approval-gated path (consent re-asserted at
   execution; the page identity). A public-comment reply posts in-thread; a DM sends in-channel.

## Outputs

`sent.md` — the final reply text, the channel, the approver, and the send result (or
`parked` / `blocked` with reason). Terminal stage.

## Audit

- [ ] Consent + window re-checked at send time (not just at draft time)
- [ ] A human approved this exact text (no auto-send — v1 every social reply is human-approved)
- [ ] Send result recorded (sent / parked / blocked + reason)

## Checkpoint

A human approves the reply before it leaves. **`auto` may self-approve NOTHING here** —
every social reply (DM or public comment) is human-approved in v1 (ADR-0124 D4 posture). The
send exits only through ADR-0058.
