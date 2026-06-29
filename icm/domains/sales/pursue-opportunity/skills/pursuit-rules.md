# Pursuit rules (hard constraints — Mark-editable, but stages treat as law)

> DEFAULTS authored by the agent 2026-06-29. Canonical frequency-cap,
> no-false-urgency, and carve-out constraints for stages 02/03/04. Stages cite;
> they do not restate. The guardrails this implements are owned upstream
> (chase.md §6, BO-02 §5, ADR-0128) — this file is the per-workflow setting.

## Frequency caps (stage 02 HARD stop)

- Max **4 pursuit touches** per open opportunity per 30 days; min spacing **3
  days** between touches.
- An opt-out / suppression in the consent ledger halts everything immediately —
  outranks every cadence (BO-01 §5).
- A tripped cap or suppression **parks the run**; the stage never composes past
  it, never "best-efforts" a shorter gap.

## No false urgency (stage 02)

- Real deadlines and real scarcity only. No manufactured clock, no invented
  expiry, no "limited spots" (BO-02 §5). A pursuit nudge builds motion, it does
  not fake a countdown.

## The transactional-acknowledgement carve-out (L3-eligible)

The ONLY touch class stage 03 may auto-send (at L3, once admin-flipped to `auto`).
A touch qualifies as a transactional-ack **only if ALL hold**:

- **Templated** — fixed template, no free-form generation of substantive content.
- **Non-committal** — asserts NOTHING about price, discount, term, capability,
  timeline, or scope; makes no promise. A bare receipt/confirmation only (e.g. a
  "we received your message / your request is logged" ack).
- **Deterministic trigger** — fires off a defined event (inbound received,
  meeting confirmed), not a judgment call about deal state.

Anything outside this set is **communicative/committal** and is **dial-proof
always-gate** — it parks for a human in every mode (ADR-0128):

- Any touch that advances, negotiates, or characterizes the deal.
- **Any** pricing / discount / term assertion, or send-for-signature — Chase has
  no commitment send path (chase.md §6); these never auto-execute at any rung,
  including the L3 ceiling.
- Anything ambiguous: when unsure whether a touch is non-committal, it is
  committal — park it.
