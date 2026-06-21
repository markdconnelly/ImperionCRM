# Channel rules (hard constraints — Mark-editable, but stages treat as law)

> DEFAULTS authored by the agent 2026-06-12. Canonical per-channel constraints
> for stages 03/04/05.

## Email (default channel)

- Sender: the shared sales mailbox (ADR-0061). Never an employee mailbox in
  this workflow.
- Consent: inbound lead = legitimate first-reply basis; `none` basis blocks
  `auto` mode (stage 04) but a human may still approve a first reply.
- Length: ≤150 words body. Subject references their inquiry, no clickbait.
- Cadence (stage 05): max 3 follow-ups; spacing 3 / 7 / 14 days; any reply or
  stop request halts the cadence.

## FB/IG DMs (in-channel replies to DM-sourced leads)

- **24-hour messaging window** (Meta platform rule): replies outside the
  window since the lead's last message are blocked — fall back to email if we
  have an address, else park the run with reason `window-expired`.
- Window edge (<2h remaining) parks for a human even in `auto` (Layer 1).
- Identity: the page. Length: ≤80 words, no links beyond the booking link.
- v1: ALL DM replies require human approval regardless of autonomy mode.

## SMS (ACS)

- v1: **not used for first contact.** Only for follow-up when the lead gave a
  phone number AND consent ledger shows explicit SMS opt-in. Max 1 follow-up.

## Apollo outbound nurture

- Outbound ≠ inbound: stricter basis. Only contacts on a list Mark approved
  for outreach; CAN-SPAM/unsubscribe footer mandatory; sequence steps are
  defined per-campaign (separate workflow file when the first campaign is
  built) — stage 03 does not freestyle outbound copy.
- v1: every outbound enrollment requires human approval (no `auto`).

## Universal

Stop/unsubscribe requests: honored immediately on every channel, consent
ledger written, run ends (stage 05 rule). This outranks everything above.
