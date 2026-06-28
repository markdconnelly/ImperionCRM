# Stage 02 — synthesize

**Job:** turn the gather record into a drift-risk-ranked roll-up with the quarantine
candidates isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Roll up the signals into areas (conformance, service quality,
   telemetry health, control drift); collapse duplicates.
2. `[sonnet]` Rank by drift risk: control drift against policy, conformance
   failures, telemetry gaps, dial settings out of bounds.
3. `[sonnet]` Isolate the quarantine candidates — each with the drift stated and why
   it warrants a hold, by reference.

## Outputs

`synthesis.md` — drift-risk-ranked roll-up (highest risk leading) and a separate
quarantine-candidate list, each item naming the area/control and the recommended
hold, by reference.

## Audit

- [ ] Roll-up is drift-risk-ranked, highest risk leading
- [ ] Every quarantine candidate names an area/control and the recommended hold
- [ ] No client PII, no secrets present (audit by reference)
- [ ] No item restates the gather list verbatim (it must be synthesized)
