# Stage 04 — review-send

**Job:** a human approves the reprice; the customer-facing proposal is sent through the
ADR-0058 path. Always-gated — never auto.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Reprice draft | `reprice-draft.md` (stage 03 output) | full | what may be sent |
| Account | silver `account` · `okf:account` | the renewing account | the recipient + relationship owner |

## Process

1. `[script]` Confirm the draft respects the margin floor and carries any required swing flag
   (a draft that fails stage 03's audit cannot reach a human as "ready").
2. **Checkpoint** — present the reprice + proposal + rationale to a human. They approve,
   edit, or reject. This is a pricing/term commitment — it parks every time, at every rung.
3. `[send.email]` On approval ONLY, send the renewal proposal via the ADR-0058
   approval-gated path. The send-for-signature step (if used) is a separate, equally
   always-gated action — never auto.

## Outputs

`sent.md` — the final proposal, the approver, and the send result (or `parked` / `rejected`
with reason). Terminal stage.

## Audit

- [ ] A human approved this exact reprice + proposal (no auto-send, ever)
- [ ] The sent number matches the approved number (no post-approval drift)
- [ ] Send result recorded (sent / parked / rejected + reason)

## Checkpoint

A human approves the priced proposal before it leaves. **`auto` may self-approve NOTHING
here** — the reprice is a pricing/term commitment, the dial-proof hard ceiling (ADR-0128 D2);
it parks at every rung. The send exits only through ADR-0058.
