# Expansion qualification rules (hard constraints — Mark-editable, but stages treat as law)

> DEFAULTS authored by the agent 2026-06-29. Canonical expansion signal set,
> qualify/disqualify bar, and route-vs-park rule for stages 02/03. Stages cite;
> they do not restate. The guardrails this implements are owned upstream
> (chase.md §6, BO-02 §5, ADR-0128) — this file is the per-workflow setting.

## Expansion is not net-new (the framing)

An existing customer is already a fit, so this workflow does **NOT** score cold
ICP fit (that is `lead-response` 02-A1's rubric). Qualify on **expansion-specific**
signals only. Never apply an ICP score here.

## The expansion signal set (stage 02)

Weigh these four, each as **signal vs inference** — a number read off the carried
context is signal; anything you reason toward is inference, and a missing number is
information, never one to fabricate (chase.md §5):

- **Entitlement / whitespace gap** — a product, tier, seat band, or service the
  account does not yet hold but the segment typically does. The clearest expansion
  signal.
- **Usage growth** — sustained growth in seats, consumption, or scope on what they
  already hold (the carried usage context), suggesting the current entitlement is
  outgrown.
- **Account health** — a healthy, low-risk relationship (carried health context).
  Expansion into an at-risk account is premature; health gates the motion.
- **Relationship context** — the interaction history and the relationship the
  sourcing owner already holds: open asks, prior interest, the right moment.

## The qualify / disqualify bar (stage 02 → 03)

- **Qualify** when there is at least one concrete whitespace/usage-growth signal
  **AND** account health is not at-risk **AND** the relationship context supports a
  pursuit now. State which signals carried it.
- **Disqualify** when there is no real whitespace/usage signal, OR health is
  at-risk (expansion is premature — relationship work comes first), OR the
  relationship context says not now.
- **Ambiguous → disqualify-and-park-back.** When the carried signals cannot ground
  a qualify call, it does not qualify; park it back rather than best-effort it
  forward.

## Pool-never-bleed (stage 02)

Any cross-account benchmark stays aggregate — never carry one account's row-level
data into another's qualification (A7, CONSTITUTION §8). Reads are tenant-isolated.

## Route vs park-to-Client-Success (stage 03)

- **Qualified → route to `pursue-opportunity` (02-A3)** as a parked proposal. The
  customer-facing motion re-inherits 02-A3's always_gate; nothing customer-facing
  is sent from this workflow.
- **Disqualified → park back to Client Success** (the relationship owner) with the
  decision rationale. Client Success owns whether and when the relationship is
  re-worked toward a later expansion.
- The qualification stamp itself is **INTERNAL and reversible** (`opportunity.write`,
  no customer-facing effect) — the only thing this workflow may self-execute, at L2
  once admin-flipped. No pricing/discount/term assertion or send ever happens here
  (chase.md §6; ADR-0128).
