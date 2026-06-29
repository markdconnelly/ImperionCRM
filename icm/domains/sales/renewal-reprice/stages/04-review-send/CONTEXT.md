# Stage 04 — review-send

**Job:** the SEND GATE (Stream 02-A8). A human authorizes the reprice; the
customer-facing send-for-signature exits through the ADR-0058 path. Always-gated —
never auto. On authorization, the signed-outcome back-sync continues in stage 05.

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
3. `[send.email]` On authorization ONLY, dispatch the renewal proposal / send-for-signature
   via the ADR-0058 approval-gated path. This is the binding customer-facing commitment —
   never auto, at any rung.

## Outputs

`sent.md` — the final proposal, the approver, and the send result (or `parked` / `rejected`
with reason). On a `sent` result, **stage 05 (sign-and-backsync)** continues the motion;
a `parked` / `rejected` result is terminal here.

## Audit

- [ ] A human approved this exact reprice + proposal (no auto-send, ever)
- [ ] The sent number matches the approved number (no post-approval drift)
- [ ] Send result recorded (sent / parked / rejected + reason)

## Checkpoint

A human approves the priced proposal before it leaves. **`auto` may self-approve NOTHING
here** — the reprice is a pricing/term commitment, the dial-proof hard ceiling (ADR-0128 D2);
it parks at every rung. The send exits only through ADR-0058.
