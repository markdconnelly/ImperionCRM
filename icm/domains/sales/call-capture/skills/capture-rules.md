# Capture rules (hard constraints — Mark-editable, but stages treat as law)

> DEFAULTS authored by the agent 2026-06-29. Canonical next-step, phrasing, and
> trace-to-interaction constraints for stages 02/03. Stages cite; they do not
> restate. The guardrails this implements are owned upstream (chase.md §5–§6,
> BO-02 §5, ADR-0113, ADR-0128) — this file is the per-workflow setting.

## What counts as a next-step (stage 02)

A next-step is **one concrete, internal advance action** on the open opportunity
that a human can approve and park — e.g. "schedule a scoping call", "send the
follow-up summary", "advance to proposal stage". It is:

- **Singular** — exactly one next-best action, not a list. If the call implies
  several, pick the next-best and note the rest in the rationale.
- **Internal/reversible** — it parks on the opportunity (`opportunity.write`); it
  never itself performs a customer-facing touch. Any outbound execution is
  `pursue-opportunity`'s (02-A3), not this workflow's.
- **Traceable** — see below; a next-step with no conv-intel basis is not a
  next-step, it is a fabrication.

## How to phrase it (stage 02/03)

- Plain imperative, one sentence: a verb + the object + the deal context.
- No fabricated capability, timeline, or price — pricing intent is a handling
  note, not numbers (chase.md §5). No false urgency (BO-02 §5).
- Voice-compliant per `../../../skills/voice-and-tone.md`; internal register
  (this is a parked proposal, not a customer message).

## Trace-to-interaction requirement (stage 02 HARD stop)

- The call OUTCOME and the NEXT-STEP **must** trace to the conv-intel-landed
  `interaction` (summary + outcome), cited with its as-of (A5). No outcome or
  next-step may be invented beyond what the analysis records.
- If the interaction is **dormant/empty** (substrate not live, no analysis landed),
  the run is **stale-not-live** — park it, never synthesize an outcome from
  nothing (A5c).
- **Pool-never-bleed (A7):** ground only on this call's interaction and this
  opportunity; never let another deal's context, another tenant's data, or a prior
  run's artifact leak into the extraction.
