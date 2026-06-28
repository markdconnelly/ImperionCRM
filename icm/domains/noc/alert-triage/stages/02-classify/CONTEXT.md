# Stage 02 — classify

**Job:** decide what the correlated alert IS, and whether a reversible fix exists.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Correlation record | stage 01 `context.md` | all | the classification subject |
| Device detail | silver `device` · `okf:device` | the implicated device(s) | confirm state for the call |
| Cloud asset detail | silver `cloud_asset` · `okf:cloud_asset` | the implicated cloud resource(s) | confirm state for the call |

## Process

1. `[sonnet]` Classify the alert: `noise` | `incident` | `security`, with one
   sentence of grounded reasoning tied to the stage-01 correlation.
2. `[sonnet]` Mark remediation candidacy: is there a reversible, runbook-covered
   fix for this signal (e.g. service/endpoint restart, clear-and-retry)?
   `runbook-reversible` | `none`. A security classification is NEVER remediation-
   candidate — containment is a gated human call.
3. `[script]` Record severity and the recommended owner: `noise` → self-close,
   `incident` → Felix, `security` → Cyrus.

## Outputs

`classification.md` — class, one-line reasoning, remediation candidacy, severity,
recommended owner. `security` forces owner=Cyrus and candidacy=none.

## Audit

- [ ] Exactly one class present, grounded in the correlation
- [ ] Remediation candidacy stated; `security` ⇒ `none`
- [ ] Recommended owner stated
