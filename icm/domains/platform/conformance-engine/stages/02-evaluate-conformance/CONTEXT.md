# Stage 02 — evaluate-conformance

**Job:** evaluate the trace against the Defined-Way ruleset rule-by-rule and identify each
divergence, labeling measured divergence vs inference.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trace + ruleset | `trace.md` (stage 01) | the run identity + loaded ruleset | the material to evaluate |
| Conformance rubric | `./skills/conformance-rubric.md` | the conform-vs-diverge call + signal-vs-inference + audit-by-reference | how to judge |

## Process

1. `[haiku]` For each rule in the Defined-Way ruleset, check the trace for the evidence that
   satisfies or violates it. Classify: conform · diverged · not-assessable (no evidence
   either way — never a silent pass).
2. `[haiku]` For each divergence, **label measured divergence vs your inference** and capture
   the evidence **by reference** (rule id + trace location) — never the sensitive value.
3. `[script]` Do not estimate into a gap: a rule with missing evidence is "not assessable,"
   recorded as such.

## Outputs

`evaluation.md` — per-rule verdict (conform / diverged / not-assessable), each divergence
with its rule id + evidence reference + measured-vs-inferred label.

## Audit

- [ ] Every ruleset rule has a verdict (no rule silently skipped)
- [ ] Each divergence labeled measured vs inferred and cited by reference
- [ ] No sensitive value reproduced; no gap estimated into a pass
