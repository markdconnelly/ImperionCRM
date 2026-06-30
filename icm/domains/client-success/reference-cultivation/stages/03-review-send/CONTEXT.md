# Stage 03 — review-send  ·  CHECKPOINT

**Job:** the consent-gated solicitation send — a human approves, then send through the ADR-0058 path and log it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Solicitation | `solicitation.md` (stage 02 output) | full | what may be sent + the requested scope of use |
| Consent basis | consent ledger · `okf:consent_event` | this recipient + channel | re-assert the basis at send time |

## Process

1. `[script]` Re-check the consent ledger / opt-out at send time (a stop/opt-out that
   arrived after stage 02 blocks the send). Opt-out outranks everything.
2. **Checkpoint** — present the solicitation + rationale + requested scope + consent basis
   to a human. They approve, edit, or reject. **This is a non-routine,
   relationship-sensitive FIRST touch → human-approved at EVERY rung, never auto.**
3. `[send.email]` / `[send.dm]` On approval, send via the ADR-0058 approval-gated path
   (consent re-asserted at execution). **No other send route exists for this workflow.**
4. `[haiku]` Log to the `interaction` timeline: sent body, channel, approver (human id —
   never `auto`), run id.

## Outputs

`sent.md` — the final solicitation text, the channel, the approver, and the send result
(or `parked` / `blocked` with reason).

## Audit

- [ ] Consent basis re-checked at send time (not only at draft time)
- [ ] Approver identity recorded — a human id, **never `auto`** (this send never auto-approves)
- [ ] Send went via the ADR-0058 path only (no other route exists)
- [ ] Send result recorded (sent / parked / blocked + reason); timeline entry id present

## Checkpoint

A human approves the solicitation before it leaves. **The solicitation send is a
customer-relationship-sensitive, non-routine FIRST touch → human-approved at EVERY rung,
never auto** — there is no auto-approve carve-out for this stage. The send exits only
through ADR-0058 with a current consent basis; NO-COMMITS-EVER and MSSP-advisory-only are
dial-proof. Opt-out outranks everything.
