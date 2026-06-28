# Renewal reprice rules (hard constraints — Mark-editable, stages treat as law)

> DEFAULTS authored by the agent 2026-06-27. Canonical reprice guardrails for
> `renewal-reprice` stages 03/04. The margin floor itself is Audrey's (Finance) — these
> rules govern how Chase drafts AROUND it, not how it's computed.

## The margin floor is binding

- The proposed number is **at or above** the grounded margin floor (stage 02). A
  below-floor draft is forbidden — fail the audit, do not "round down to win".
- No margin floor present → park `awaiting-margin` (route to Audrey). Never reprice on a
  guessed margin (Chase does not guess into a data gap).

## Justify by value, not pressure

- Justify the number from value delivered — usage, outcomes, scope, risk reduced. Never
  manufacture urgency or scarcity to force a yes (false urgency is overselling).
- A bad-fit renewal that's churning anyway is named honestly, not propped up with a
  discount that erodes margin for no retention.

## Escalate large swings

- A large swing vs last term — material increase OR a discount below a normal band — is
  **flagged for a human**, not buried in the proposal. The human decides; Chase surfaces.

## The send is always-gated

- The priced proposal / send-for-signature is a pricing/term commitment — the dial-proof
  hard ceiling (ADR-0128 D2). It never auto-executes at any rung; a human approves every
  send (ADR-0058). Chase drafts; the company commits.
