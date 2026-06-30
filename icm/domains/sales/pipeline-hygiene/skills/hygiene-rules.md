# Hygiene rules (hard constraints — Mark-editable, but stages treat as law)

> DEFAULTS authored by the agent 2026-06-29. Canonical staleness thresholds,
> the data-quality field checklist, and the route-vs-stamp rule for stages
> 01/02/03/04. Stages cite; they do not restate. The guardrails this implements
> are owned upstream (chase.md §6, BO-02 §5, ADR-0128) — this file is the
> per-workflow setting.

## Staleness thresholds (stage 01)

An open opportunity is **stale** when ANY holds, measured against its last
interaction / last stage change:

- No movement (no interaction and no stage change) in **21 days**.
- Past its `close_date` with the opportunity still open.
- In an early stage (qualify/discovery) with no interaction in **14 days**.

A stale opportunity is a **flag**, never a customer-facing action — it routes to
`pursue-opportunity` (02-A3) per the route rule below.

## Data-quality field checklist (stages 01/03)

Every open opportunity is checked for these required internal fields; a missing
one is a **data-quality gap**:

- **owner** — an assigned AE.
- **stage** — a valid pipeline stage.
- **amount** — an expected value.
- **close_date** — an expected close date.
- **next_action** — a queued next step.
- **source/attribution** — the demand source (campaign / inbound / referral).

A gap is internal only. Whether it can be auto-stamped is the route-vs-stamp rule.

## Route-vs-stamp rule (stages 03/04)

- **Internal reversible data-quality stamp** — a missing *internal* field whose
  correct value is unambiguous from the record (e.g. stamping the owning AE from
  the account, or a default internal stage marker) may be set via
  `opportunity.write`. Internal only, reversible, **no customer-facing effect**.
  This is the only write this workflow makes, and the only thing stage 03 may
  auto-self-approve (at L2, once admin-flipped).
- **Customer-facing follow-up** — anything that needs a touch to the prospect (a
  stale-deal nudge, an answer to an open question, a missing close-date that only
  the customer can confirm) is **NOT** done here. It routes to
  `pursue-opportunity` (02-A3) as a parked proposal and re-inherits that
  workflow's always_gate; a human approves the send there.
- **Anything ambiguous** — when unsure whether a fix is an internal stamp or a
  customer-facing touch, it is customer-facing — route it, never stamp it. Any
  pricing/discount/term value or send-for-signature is always-gate and is never
  this workflow's to set (chase.md §6, BO-02 §5).
