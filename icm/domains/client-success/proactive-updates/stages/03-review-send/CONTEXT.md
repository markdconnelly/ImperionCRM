# Stage 03 — review-send  ·  CHECKPOINT

**Job:** the consent-gated send — approve (human or, where allowed, auto), then send through the ADR-0058 path and log it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Draft | `draft.md` (stage 02 output) | full | what may be sent + the sensitivity tag |
| Consent basis | consent ledger · `okf:consent_event` | this recipient + channel | re-assert the basis at send time |

## Process

1. `[script]` Re-check the consent ledger at send time (a stop/opt-out that arrived after
   stage 02 blocks the send). Opt-out outranks everything.
2. **Checkpoint** — present the draft + rationale + sensitivity tag + consent basis to a
   human. They approve, edit, or reject. (A routine knowledge how-to may auto-approve per
   the gate below.)
3. `[send.email]` / `[send.dm]` On approval, send via the ADR-0058 approval-gated path
   (consent re-asserted at execution). **No other send route exists for this workflow.**
4. `[haiku]` Log to the `interaction` timeline: sent body, channel, approver (human id or
   `auto`), run id.

## Outputs

`sent.md` — the final share text, the channel, the approver, and the send result
(or `parked` / `blocked` with reason). Terminal stage.

## Audit

- [ ] Consent basis re-checked at send time (not only at draft time)
- [ ] Approver identity recorded (never blank; `auto` only when the gate below held)
- [ ] Send result recorded (sent / parked / blocked + reason)
- [ ] Timeline entry id present

## Checkpoint

A human approves the share before it leaves. **`auto` may self-approve ONLY a routine
knowledge how-to (the share kind tagged routine-how-to), at the earned rung, with a current
consent basis** — the L3-with-approval → L4-fully-auto progression in `sharing-rubric.md`
(the full L0–L5 map is celeste.md; the manifest rung here is capped at L3). **Every
customer-relationship-sensitive / non-routine send — a churn-save, an advisory, a first
touch — parks for a human in every mode.** The send exits only through ADR-0058;
NO-COMMITS-EVER and MSSP-advisory-only are dial-proof.
