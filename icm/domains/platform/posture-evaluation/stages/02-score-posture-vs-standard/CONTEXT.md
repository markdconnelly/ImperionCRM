# Stage 02 — score-posture-vs-standard

**Job:** evaluate the snapshot against the standard criterion by criterion and produce the
overall_score + conformance_status with the get-back-in-shape evaluation.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Scoring input | `scoring-input.md` (stage 01) | standard + snapshot + account by reference | the material to score |
| Scoring method | `domains/platform/skills/posture-scoring-method.md` | per-criterion verdicts, composite, the three bands | the method |
| Conformance rubric | the shared `conformance-engine/skills/conformance-rubric.md` | signal-vs-inference + audit-by-reference | how to state the evaluation |

## Process

1. `[haiku]` For each criterion in the ratified criteria document: check the snapshot
   evidence → **pass / fail / not-assessable**. A not-assessable criterion **never silently
   passes** — it is excluded from the composite and recorded as a data gap. Unknown criteria
   fields are noted, not enforced (0256 forward-compatibility — never a false critical).
2. `[script]` Compute `overall_score` and the band per the method:
   `conforming | drifting | critical` (`minCompositeScore` / `requiredPillars` /
   `criticalCompositeFloor`).
3. `[sonnet]` Draft the **get-back-in-shape evaluation**: each failing criterion with its
   gap stated **by reference** (snapshot id + criterion id), the band driver named
   plainly, measured vs inferred labeled. No posture values, no remediation steps promised
   as Vera's own act (the advisory plan is B4, #1471).

## Outputs

`evaluation.md` — per-criterion verdicts, the data-gap list, `overall_score` +
`conformance_status`, and the get-back-in-shape evaluation (by reference throughout).

## Audit

- [ ] Every criterion has a verdict (pass / fail / not-assessable — none skipped)
- [ ] No not-assessable criterion counted as a pass; data gaps listed
- [ ] Score + band computed per the shared method; evaluation cites by reference only
