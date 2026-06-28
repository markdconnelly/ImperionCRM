# Social reply rules (hard constraints — Mark-editable, stages treat as law)

> DEFAULTS authored by the agent 2026-06-27. Canonical per-channel constraints for
> stages 03/04 of `social-inbound-reply`. These are SOCIAL-engagement reply rules
> (public comments + DMs); the lead-response email/SMS/Apollo first-response rules are
> a separate skill in that workflow. The 24-hour DM window is a Meta **platform**
> constraint, cited here, not owned here.

## Public comment reply (FB/IG/Threads, in-thread)

- Public and permanent — brand-safe, concise, no client PII, no internal detail.
- Answer briefly in-thread; move anything specific (pricing intent, account detail) to
  a DM or email. One CTA, ≤ ~50 words.
- Never argue in public. A complaint or dispute routes to a human / Celeste, not a
  freelanced rebuttal.

## Private DM reply (FB/IG/Threads, in-channel)

- **Platform messaging window** (Meta's rule): replies outside the platform's window
  since the author's last message are blocked — fall back to email/booking-link if we
  have an address, else park with reason `window-expired`.
- Identity: the page, never an employee handle. Length: ≤80 words, no links beyond the
  booking link.
- **Lead/prospect only.** A 1:1 DM to an existing CUSTOMER is not Chase's to send — it
  routes to Celeste/Felix (Belle's hard prohibition; Chase owns the sales-intent
  prospect motion, not the customer relationship).

## v1 autonomy

- **Every** social reply (comment or DM) is human-approved in v1, regardless of mode
  (ADR-0124 D4 posture). The agent drafts; a human approves the send.

## Universal

Stop / unsubscribe / opt-out is honored immediately on every channel, the consent ledger
is written, and the run ends. This outranks everything above.
