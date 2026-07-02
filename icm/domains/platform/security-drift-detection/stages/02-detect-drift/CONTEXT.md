# Stage 02 — detect-drift

**Job:** compare the newest verdict against the prior one and identify drift — status
downgrade, band drop, new criterion failures — separating drift from noise, measured from
inferred.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| History | `history.md` (stage 01) | the same-version comparison pair + snapshot context | the material to compare |
| Scoring method | `domains/platform/skills/posture-scoring-method.md` | the drift definition + the noise exclusions | what counts as drift |
| Conformance rubric | the shared `conformance-engine/skills/conformance-rubric.md` | signal-vs-inference + audit-by-reference | how to state the finding |

## Process

1. `[script]` Compare the pair mechanically: status downgraded? `overall_score` crossed a
   band boundary downward? criterion failures in the newest verdict absent from the prior?
   Each is a **measured** drift signal, cited by reference (verdict ids + criterion ids).
2. `[script]` Apply the noise exclusions: within-band score movement with no new failure, a
   not-assessable flip from missing snapshot evidence (a **data gap**, surfaced as a gap),
   or any cross-version delta — none of these is drift; each is recorded as what it is.
3. `[haiku]` For each drift signal, characterize it: which criteria drove it, what the
   snapshot evidence behind the new failure shows (by reference), and any suspected cause —
   **labeled inference**, never presented as measured. Never estimate a cause into a gap.
   A no-baseline run passes through as "no comparison possible."

## Outputs

`drift.md` — per drift signal: kind (downgrade / band drop / new failure), the driving
criteria by reference, measured-vs-inferred labels; plus the noise/gap notes and the drift
severity (a drop **to critical**, or a critical-designated criterion newly failing, marks
the finding critical).

## Audit

- [ ] Every drift signal is measured against the same-version pair and cited by reference
- [ ] Noise and data gaps excluded and recorded as such — none escalated as drift
- [ ] Causes labeled inference; nothing estimated into a gap; critical severity assigned per the method
