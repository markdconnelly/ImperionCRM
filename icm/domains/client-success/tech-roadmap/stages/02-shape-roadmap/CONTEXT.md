# Stage 02 — shape-roadmap

**Job:** sequence the candidate initiatives by client-value × dependency, labeling signal
vs inference.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Strategic context | `strategic-context.md` (stage 01 output) | full | current state vs target state |
| Roadmap rubric | `./skills/roadmap-rubric.md` | all | roadmap structure + signal-vs-inference + no-commits framing |
| Engagement + service | silver `interaction` / `ticket` · `okf:interaction` `okf:ticket` | recent history for this account | service-pattern + engagement signals that drive initiative priority |

## Process

1. `[sonnet]` Derive the candidate initiatives that move the client from current to target
   state, per `roadmap-rubric.md`. For each, **label measured signal vs your inference** —
   the signals that justify it (a service-pattern trend, a renewal, an asset/posture
   handoff) vs your reading of them (celeste.md guardrail 3). Never invent client health,
   posture, or inventory.
2. `[sonnet]` Sequence the initiatives by **client-value × dependency**: what unlocks
   what, and what the client most needs first. Advise in the client's interest — flag any
   **non-interest upsell** explicitly, never sequence spend purely for Imperion's revenue
   (guardrail 4).

## Outputs

`roadmap-shape.md` — the sequenced initiatives, each carrying its signals (measured) vs
inference label, its value/dependency rationale, and any non-interest-upsell flag.

## Audit

- [ ] Every initiative labels measured signal vs inference
- [ ] The sequence states a client-value × dependency rationale (not an arbitrary order)
- [ ] Any non-interest upsell is flagged, not buried
- [ ] Only this client's data was read (no cross-client leakage)
