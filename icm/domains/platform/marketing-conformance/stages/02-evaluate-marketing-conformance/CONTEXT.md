# Stage 02 — evaluate-marketing-conformance

**Job:** evaluate the Belle trace against the marketing Defined-Way ruleset rule-by-rule and
identify each divergence, labeling measured divergence vs inference.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trace + ruleset | `trace.md` (stage 01) | the run identity + loaded marketing ruleset | the material to evaluate |
| Marketing ruleset | `./skills/marketing-defined-way.md` | the marketing rules + severities | the expectations to check |
| Conformance rubric | the shared `conformance-engine/skills/conformance-rubric.md` | the conform-vs-diverge call + signal-vs-inference + audit-by-reference | how to judge |

## Process

1. `[haiku]` For each marketing rule (all-social-approved, ad-budget ceiling, compose-once/
   fan-out, public-vs-DM, no-PII-public, brand-voice, scope-stayed), check the trace for the
   evidence that satisfies or violates it. Classify: conform · diverged · not-assessable
   (never a silent pass).
2. `[haiku]` For each divergence, **label measured divergence vs your inference** and capture
   the evidence **by reference** (rule id + trace location) — never the audience PII, ad
   spend, or campaign terms.
3. `[script]` Do not estimate into a gap: a rule with missing evidence is "not assessable,"
   recorded as such. A **hard**-rule divergence drives the overall finding to diverged.

## Outputs

`evaluation.md` — per-rule verdict (conform / diverged / not-assessable), each divergence
with its rule id + evidence reference + measured-vs-inferred label.

## Audit

- [ ] Every marketing rule has a verdict (no rule silently skipped)
- [ ] Each divergence labeled measured vs inferred and cited by reference
- [ ] No audience PII / ad spend / campaign terms reproduced; no gap estimated into a pass
