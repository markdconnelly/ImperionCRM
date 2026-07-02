# Stage 02 — draft-standard-version

**Job:** draft the next standard version — declarative criteria jsonb, a version rationale,
and an explicit per-criterion diff vs the current version.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Landscape | `landscape.md` (stage 01) | current version + fleet summary + data gaps | what the draft must describe |
| Authoring rules | `./skills/standard-authoring.md` | criteria document shape + never-weaken-silently + versioning discipline | the authoring contract |
| Conformance rubric | the shared `conformance-engine/skills/conformance-rubric.md` | signal-vs-inference + audit-by-reference | how to state the rationale |

## Process

1. `[sonnet]` Draft the criteria jsonb (declarative StandardCriteria — checks over
   `posture_snapshot` fields only, severity thresholds per the authoring rules). A bar the
   snapshot cannot evidence is not authored — the snapshot enrichment is proposed instead.
2. `[sonnet]` Write the version rationale: per changed criterion, why — labeling what the
   landscape **measured** vs what is **inferred** to be the right bar. Never estimate a
   threshold into a data gap.
3. `[script]` Produce the explicit diff vs the current version: per criterion —
   tightened / unchanged / added / removed / **weakened**. Every weakened criterion is
   flagged with its own rationale line; a silent weakening is an audit failure. First run
   (no current version): the diff is "v1 — no predecessor," stated as such.

## Outputs

`draft.md` — the draft version: proposed `version_number`, the criteria jsonb, the
rationale, and the explicit diff table (with every weakening flagged). No posture values
reproduced; nothing ratified.

## Audit

- [ ] Every criterion is a declarative check over snapshot-evidenceable fields
- [ ] Explicit diff present; every weakened criterion flagged with its own rationale
- [ ] Rationale labels measured vs inferred; no threshold estimated into a data gap
