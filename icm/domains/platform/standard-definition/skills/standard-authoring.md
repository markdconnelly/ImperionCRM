# Standard authoring rules (Mark-editable — the criteria document, the versioning discipline, the ratify gate)

> DEFAULTS authored by the agent 2026-07-01. How the `standard-definition` workflow (B1,
> #1468) authors a draft `security_standard_version` (mig 0256). The scoring method the
> criteria feed is the shared `domains/platform/skills/posture-scoring-method.md`; the
> signal-vs-inference + audit-by-reference discipline is the shared `conformance-engine`
> rubric — this file supplies only the authoring rules. Mark: edit freely; stages cite
> this, nothing restates it.

## What a criteria document contains

The `criteria` jsonb is a **declarative** StandardCriteria document (0256, BE ADR-0105
there) — checks, never code:

- **Declarative checks over `posture_snapshot` fields.** Every criterion names a snapshot
  field/pillar and the bar it must meet (`minCompositeScore`, `requiredPillars`,
  `criticalCompositeFloor`, …). A criterion the snapshot cannot evidence is unauthorable —
  propose the snapshot enrichment instead, never a criterion that can only ever be
  not-assessable.
- **Severity bands.** The document defines what makes a client `conforming` / `drifting` /
  `critical` (the band semantics live in `posture-scoring-method.md`; the document supplies
  the thresholds). A criterion may be designated critical — its failure alone drives the
  band to critical.
- **Forward-compatible.** Unknown fields are ignored by the evaluator (0256) — additive
  evolution is safe; a rename/removal is a diff line, never silent.

## The versioning discipline

- **draft → ratified → superseded**, one direction only (the 0256 status CHECK). The
  current standard = the highest `version_number` with `status='ratified'`.
- **One ratified version at a time** — ratifying a new version supersedes the prior; the
  supersession and the re-scoring of the fleet against the new baseline is B5
  (`standard-reevaluation`, #1472).
- **Supersede, never delete.** A version with verdicts is governance record — every
  `posture_score` row is reproducible against its `standard_version_id` (0256: no ON DELETE
  on that FK). `version_number` is monotonic and UNIQUE.
- **Never weaken silently.** A draft criterion weaker than the ratified current (a lower
  threshold, a dropped pillar, a lifted floor) is **explicitly flagged** in the diff with
  its own rationale line. A weakening that surfaces only on close reading is an authoring
  failure.

## The ratify gate

Ratification is **`always_gate` to Mark** at every rung (vera.md / room.md): Vera drafts,
Mark ratifies — she never marks her own homework. The mechanical act is the backend's
Mark-gated conditional UPDATE (`status='draft'` → `'ratified'`, with
`ratified_by_user_id`/`ratified_at` audit attribution — BE #439); Vera holds no write to
the store (0256 grants the frontend/backend, not an agent tool). Until ratified, a draft
binds nothing: B2 scores only against the **ratified** current, never a draft.

## NOT the internal unified-security-standard

This is the **client** security standard — the bar client fleets are measured against and
Celeste presents to clients. It is **not** `docs/security/unified-security-standard.md`,
the internal baseline Imperion's own four repos conform to. The two never merge: the
internal standard is repo governance (owned in `ImperionCRM/docs/security/`, changed by
PR); the client standard is a versioned DB store (0256) ratified by Mark. A draft here
never cites the internal standard as authority for a client criterion.
