# Stage 02 — draft-update

**Job:** draft the corrected or new doc for each drifted/missing unit, grounded in
the real CI.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Drift record | stage 01 `drift.md` | `stale` / `contradictory` / `missing` units | the units to draft |
| CI detail | silver `device` / `cloud_asset` · `okf:device` `okf:cloud_asset` | the CI each draft describes | the ground truth the doc states |
| Prior docs / fixes | `knowledge.search` + `memory.recall` | the existing doc + any landed fix (e.g. Sage's) | base to update + the resolution to turn into a runbook |

## Process

1. `[sonnet]` For each unit, draft the corrected/new doc: a structured runbook
   (symptom / steps / the CI it touches by id / verification), grounded in the CI
   record. For a landed-fix trigger, author the runbook **from the fix** Sage landed.
2. `[script]` Mark every claim the CI did not confirm `[unverified]` — never invent a
   step, a sequence, or a value.
3. `[script]` Scrub the draft: no secret value, no PII, no client identifier — a
   needed secret references its vault entry by name, never its value.

## Outputs

`draft.md` — one drafted doc per unit: title, the CI id it describes, structured
runbook body, `[unverified]` marks, vault-entry references (never values). The draft is
the working copy — not yet published.

## Audit

- [ ] Every non-`current` unit from stage 01 has a drafted doc mapped to a CI id
- [ ] Every unverified claim is marked `[unverified]` (no invented procedure)
- [ ] No secret value, no PII, no client identifier in any draft (reference only)
