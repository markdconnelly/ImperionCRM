# Stage 02 — assemble-evidence

**Job:** pull the posture/policy facts in scope, tie each to its control, and mark
every in-scope control verified or unverified against the golden baseline.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Scope | stage 01 `scope.md` | full | the framework + control universe |
| Posture facts | silver `posture_snapshot` · `okf:posture_snapshot` | in-scope posture | per-control evidence |
| Tenant drift | silver `tenant_posture` · `okf:tenant_posture` | in-scope tenants | baseline-drift detection |
| Policy baselines | silver `posture_policy` · `okf:posture_policy` | the golden baselines | the control expectation |

## Process

1. `[script]` Pull the `posture_snapshot` facts and `posture_policy` golden
   baselines for the scope — reference facts only, never copy PII or secret
   material.
2. `[sonnet]` Tie each collected fact to the control objective it satisfies; cite
   the source row for every evidence item (no uncited evidence).
3. `[script]` Compare in-scope `tenant_posture` against `posture_policy` golden
   baselines; flag drift.
4. `[sonnet]` Mark each in-scope control **verified** (cited evidence meets the
   baseline) or **unverified** (no satisfying evidence, or evidence drifting from
   baseline). A control with no satisfying evidence is unverified — never asserted
   compliant.

## Outputs

`evidence.md` — the in-scope controls keyed to their cited evidence, the
verified/unverified status of each (with one sentence of reasoning for every
unverified call), drift flags, and the owning `account` id(s). Feeds the stage-03
report.

## Audit

- [ ] Every evidence item carries a source citation (no uncited evidence)
- [ ] Every in-scope control is marked verified or unverified — none left implicit
- [ ] No control is asserted compliant without a cited, baseline-meeting evidence chain
- [ ] No client PII or secret material in the record (audit-by-reference)
