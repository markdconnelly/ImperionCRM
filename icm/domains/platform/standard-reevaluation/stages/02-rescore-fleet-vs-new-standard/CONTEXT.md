# Stage 02 — rescore-fleet-vs-new-standard

**Job:** re-score each client's latest snapshot against the newly-ratified baseline and
identify the newly-non-compliant by comparison to the superseded-version verdict.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Ratification event | `ratification-event.md` (stage 01) | the new + superseded version ids + the fleet roster with refs | the material to re-score |
| Scoring method | `domains/platform/skills/posture-scoring-method.md` | criteria → checks → score + the newly-non-compliant definition | how to score + classify |
| Conformance rubric | the shared `conformance-engine/skills/conformance-rubric.md` | signal-vs-inference + audit-by-reference | how to state each verdict |

## Process

1. `[script]` For each client with a snapshot, re-score its latest `posture_snapshot`
   criterion-by-criterion against the **newly ratified** version's criteria (never a draft) —
   `overall_score` + `conformance_status` per the shared method. A not-assessable criterion is
   a **data gap**, excluded from the composite, never a silent pass. This is the exact verdict
   shape the backend persists (idempotent INSERT into `posture_score`, the 0256 UNIQUE the
   arbiter, BE #439) — Vera produces it, never writes it.
2. `[script]` Classify **newly-non-compliant** per the method: a client whose superseded-version
   verdict was `conforming` and whose new-version verdict is `drifting`/`critical` (same
   snapshot vintage where one exists). A client with no prior verdict is re-scored but not
   classified (nothing to compare) — stated as such.
3. `[haiku]` Summarize the fleet movement: how many clients moved band, the newly-non-compliant
   list (by reference), and the gaps (no-snapshot / no-prior clients) — labeling measured
   verdicts vs inferred cause. The cause of a newly-non-compliant flag is **the standard
   moving** (inference stated plainly), never client drift.

## Outputs

`rescore.md` — per client: the new-version verdict (score + band, by reference) and its
newly-non-compliant classification (or the no-prior/no-snapshot note); plus the fleet-movement
summary. No posture values reproduced.

## Audit

- [ ] Every client with a snapshot re-scored against the new version only (never a draft)
- [ ] Newly-non-compliant classified per the method (was conforming → now drifting/critical); no-prior noted
- [ ] Not-assessable excluded as gaps; cause labeled "the standard moved," not client drift
