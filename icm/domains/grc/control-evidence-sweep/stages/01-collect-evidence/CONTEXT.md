# Stage 01 — collect-evidence

**Job:** turn a sweep scope into a citation-backed evidence set, each fact tied to
the control it satisfies.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sweep scope | the triggering event (cadence run / control event) | scope ids | the subject |
| Account in scope | silver `account` · `okf:account` | the customer(s) under sweep | scope + ownership |
| Posture facts | silver `posture_snapshot` · `okf:posture_snapshot` | in-scope posture | per-control evidence |
| Policy baselines | silver `posture_policy` · `okf:posture_policy` | the golden baselines | the control expectation |

## Process

1. `[script]` Resolve the sweep scope to the owning `account`(s) and the controls
   in scope. No scope resolvable → audit fail.
2. `[script]` Pull the `posture_snapshot` facts and `posture_policy` baselines for
   the scope — reference facts only, never copy PII or secret material.
3. `[sonnet]` Tie each collected fact to the control it satisfies; cite the source
   row for every evidence item (no uncited evidence).

## Outputs

`evidence.md` — the collected, cited evidence set keyed by control, the owning
`account` id(s), and the baseline expectations. Feeds stage-02 gap detection.

## Audit

- [ ] Every evidence item carries a source citation (no uncited evidence)
- [ ] The sweep scope resolves to at least one account + control
- [ ] No client PII or secret material in the record (audit-by-reference)
