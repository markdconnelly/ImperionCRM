# Stage 01 — detect-drift

**Job:** classify each in-scope doc-unit as stale / contradictory / missing / current.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trigger | the poll cadence, CI change event, or landed-fix event | the doc-unit(s) in scope | what to check |
| CI surface | silver `device` / `cloud_asset` · `okf:device` `okf:cloud_asset` | the CIs the in-scope docs describe | ground truth to compare docs against |
| Owning account | silver `account` · `okf:account` | the account each CI/doc belongs to | scope docs to the right client |
| Existing docs | `knowledge.search` over gold (IT Glue) | the current runbooks for these CIs | the docs to test for drift |

## Process

1. `[script]` Resolve scope: the poll batch, the changed CI from a change event, or
   the fix subject from a landed-fix event. Attach each in-scope CI to its `account`.
2. `[haiku]` For each CI, retrieve its existing doc(s) via `knowledge.search`. A CI
   with no doc → `missing`.
3. `[sonnet]` Compare each doc against the real CI record: `stale` (doc claims differ
   from the CI), `contradictory` (two docs about the same CI disagree), or `current`.
   One sentence of grounded reasoning per classification; flag low confidence.
4. `[script]` Record the classification per doc-unit with the CI id and account id.

## Outputs

`drift.md` — one row per doc-unit: CI id, account (by reference), doc reference,
classification (`stale` / `contradictory` / `missing` / `current`), reasoning. `current`
units end the run for that unit (nothing to draft).

## Audit

- [ ] Every in-scope doc-unit has exactly one classification + a CI id
- [ ] Each non-`current` classification states grounded reasoning (the specific drift)
- [ ] No verbatim PII / secret in the output (reference by id)
