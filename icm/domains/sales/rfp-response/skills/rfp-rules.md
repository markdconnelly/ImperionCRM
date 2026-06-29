# RFP response rules (hard constraints — Mark-editable, stages treat as law)

> DEFAULTS authored by the agent 2026-06-29. Canonical bid-assembly guardrails for
> `rfp-response` stages 01-03. These govern how Chase grounds, prices, and seams the
> response — not how the 02-C1 floor or the security content is computed (those live
> upstream).

## Cite or refuse — no fabricated capabilities or certifications

- Every capability, certification, compliance, or track-record claim in the response is
  **grounded in a cited source + as-of** (A5) or it does **not ship**. A claim with no
  recall is **parked `awaiting-evidence`** for a human — never invented to win the bid
  (A5b, CS-07 §5). A bid is won on what's true; an oversold capability is future churn or
  a failed audit.
- "We don't have evidence for that yet" is a valid answer and a parked section. Manufacturing
  a capability to close a gap is a refusal-class failure of the run.

## Pricing stays within the 02-C1 envelope

- Bid pricing is **at or within the 02-C1 rate-card floor / discount tiers**. A draft that
  **breaches** the floor (discount depth, non-standard term/SLA) is **routed to 02-C2 deal
  desk before submit** — flagged, never freelanced, never submitted on an unapproved breach.
- The deal-desk exception, once granted, is recorded; the bid then submits **against the
  recorded exception**. No breach reaches the submit gate as "ready" without it.

## The security/compliance section is Grace's content (Chase never self-authors)

- The control set, attestations, and security/compliance answers are supplied by **Grace
  (#1557)** as a handoff (Stream 07). Chase **assembles** that content into the response;
  Chase **never writes a security or compliance claim** himself (A11 obligation/action
  separation — Grace owns the security standard).
- If the Grace-supplied content is **absent**, that section **parks** (refuse-precondition) —
  the bid does not proceed with a self-written security answer.

## The submission is always-gated

- Submitting a bid is a **binding client-facing commitment** (pricing/term) — the dial-proof
  hard ceiling (A2 class-2/6, ADR-0128 D2). It **never auto-executes at any rung**; a human
  approves every submission (ADR-0058). Chase assembles; the company commits.
