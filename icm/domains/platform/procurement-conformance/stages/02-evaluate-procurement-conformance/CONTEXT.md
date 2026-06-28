# Stage 02 — evaluate-procurement-conformance

**Job:** evaluate the Vance trace against the procurement Defined-Way ruleset rule-by-rule and
identify each divergence, labeling measured divergence vs inference.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trace + ruleset | `trace.md` (stage 01) | the run identity + loaded procurement ruleset | the material to evaluate |
| Procurement ruleset | `./skills/procurement-defined-way.md` | the procurement rules + severities | the expectations to check |
| Conformance rubric | the shared `conformance-engine/skills/conformance-rubric.md` | the conform-vs-diverge call + signal-vs-inference + audit-by-reference | how to judge |

## Process

1. `[haiku]` For each procurement rule (approve-once-money-gate, no-unapproved-order,
   sequence-governed, right-sizing-evidence, no-rollback-assumed, scope-stayed), check the
   trace for the evidence that satisfies or violates it. Classify: conform · diverged ·
   not-assessable (never a silent pass).
2. `[haiku]` For each divergence, **label measured divergence vs your inference** and capture
   the evidence **by reference** (rule id + trace location) — never the vendor pricing, order
   amounts, or license counts.
3. `[script]` Do not estimate into a gap: a rule with missing evidence is "not assessable,"
   recorded as such. A **hard**-rule divergence drives the overall finding to diverged.

## Outputs

`evaluation.md` — per-rule verdict (conform / diverged / not-assessable), each divergence
with its rule id + evidence reference + measured-vs-inferred label.

## Audit

- [ ] Every procurement rule has a verdict (no rule silently skipped)
- [ ] Each divergence labeled measured vs inferred and cited by reference
- [ ] No vendor pricing / order amounts / license counts reproduced; no gap estimated into a pass
