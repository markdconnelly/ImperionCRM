# Stage 03 — classify-path

**Job:** assign severity/category and choose one troubleshooting path, with the
decision logic written out.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Dossier | stage 01 `dossier.md` | all | symptom + scope |
| Asset status | stage 02 `asset-status.md` | all | corroborating state + anomalies |
| Severity rubric | `../../skills/severity-rubric.md`* | all | severity + category |
| Path catalogue | `../../skills/troubleshooting-paths.md`* | path entry signals | the candidate paths |

\* workflow-local skills (Tier 3); cited by the manifest.

## Process

1. `[sonnet]` Assign exactly one severity and one category per the rubric.
2. `[sonnet]` Choose exactly one troubleshooting path — `endpoint` | `cloud` |
   `network` | `identity` | `other` — by matching the dossier symptom and the
   stage-02 anomalies against each path's entry signals.
3. `[sonnet]` **Write the decision logic** (a required output, not a side-effect):
   the signals considered, why the chosen path fits, and why the closest runner-up
   was rejected.
4. `[script]` If the path is `identity`, or the symptom touches backups or domain
   controllers, set `escalate-only = true` — Felix escalates rather than running
   steps (the guardrail).

## Outputs

`triage-decision.md` — severity · category · chosen path · the written decision
logic · runner-up + rejection reason · `escalate-only` flag.

## Audit

- [ ] Exactly one path, one severity, and one category chosen
- [ ] Decision logic names the signals AND rejects the runner-up explicitly (no bare verdict)
- [ ] `escalate-only = true` whenever the symptom is identity / backup / domain-controller
