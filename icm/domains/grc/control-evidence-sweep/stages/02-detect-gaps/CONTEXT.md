# Stage 02 — detect-gaps

**Job:** map the collected evidence to SOC 2 / HIPAA / CMMC control objectives and
surface every gap and every drift from the golden baseline.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Evidence set | stage 01 `evidence.md` | full | the subject |
| Framework objectives | knowledge search (SOC 2 / HIPAA / CMMC) over gold | controls in scope | the mapping target |
| Tenant drift | silver `tenant_posture` · `okf:tenant_posture` | in-scope tenants | baseline-drift detection |
| Policy baselines | silver `posture_policy` · `okf:posture_policy` | golden baselines | drift comparison |

## Process

1. `[sonnet]` Map each control objective (SOC 2 / HIPAA / CMMC, via
   `knowledge.search`) to its satisfying evidence; cite the framework control id.
2. `[script]` Compare in-scope `tenant_posture` against `posture_policy` golden
   baselines; flag drift.
3. `[sonnet]` Call gaps: a control with no satisfying evidence, or evidence drifting
   from baseline, is a gap. For each, state control, expectation, observed reality,
   and a severity (high/medium/low).

## Outputs

`gaps.md` — the mapped control coverage, the list of gaps + drift with severities
and reasoning, each tied to a named framework control. Feeds the stage-03 report.

## Audit

- [ ] Every gap names a specific framework control and its expectation
- [ ] Every gap carries a severity with one sentence of reasoning
- [ ] No client PII or secret material in the record (audit-by-reference)
