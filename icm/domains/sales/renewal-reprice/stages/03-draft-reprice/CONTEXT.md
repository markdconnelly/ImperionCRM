# Stage 03 — draft-reprice

**Job:** draft the reprice and the renewal proposal within the margin floor.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Renewal context | `renewal-context.md` (stage 01 output) | full | the baseline + what changed |
| Margin floor | `margin.md` (stage 02 output) | the grounded floor | the binding constraint |
| Voice | `../../skills/voice-and-tone.md` | all | every sales draft sounds the same |
| Reprice rules | `./skills/renewal-rules.md` | all | reprice guardrails |

## Process

1. `[sonnet]` Draft the reprice number **at or above the margin floor** — justified by value
   delivered (usage, outcomes, scope), never by manufactured urgency. A number below the
   floor is forbidden; a large swing (up or down) is flagged for a human, not buried.
2. `[sonnet]` Draft the renewal proposal copy: the new terms, the rationale, one CTA. Pricing
   intent is grounded in the margin input — never freelanced, never invented.
3. `[script]` Attach the rationale: the floor respected, the swing vs last term, and any flag.

## Outputs

`reprice-draft.md` — the proposed reprice (number + terms), the proposal copy, and the
rationale (floor, swing, flags). Nothing is sent here.

## Audit

- [ ] The proposed number is at or above the margin floor (a below-floor draft fails)
- [ ] Any large swing vs last term is explicitly flagged, not buried
- [ ] No fabricated urgency; pricing is grounded in the margin input, not invented
