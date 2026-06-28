# Stage 02 — root-cause

**Job:** trace the diagnostic chain from symptom to a grounded root cause.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Cluster record | stage 01 `cluster.md` | all | the investigation subject |
| Incident detail | silver `ticket` · `okf:ticket` | the cluster's tickets, full detail | the symptom timeline |
| Device detail | silver `device` · `okf:device` | the implicated device(s) | correlate cause to CI state |
| Cloud asset detail | silver `cloud_asset` · `okf:cloud_asset` | the implicated cloud resource(s) | correlate cause to CI state |

## Process

1. `[sonnet]` Build the diagnostic chain: order the symptom timeline, line it up
   against CI state changes, and reason from symptom → contributing factors →
   candidate cause.
2. `[sonnet]` Name the root cause with one line of grounded reasoning. Label any
   factor you cannot yet rule out as an open hypothesis — do not assert it as the
   cause.
3. `[script]` Classify the cause's likely fix surface: `reversible-no-prod` vs
   `production-or-irreversible` (drives the stage-03 routing).

## Outputs

`root-cause.md` — the diagnostic chain, the named cause + reasoning, open
hypotheses, and the fix-surface classification. A cause that cannot be grounded is
recorded as the strongest hypothesis with what evidence would confirm it.

## Audit

- [ ] Diagnostic chain present and tied to the cluster evidence
- [ ] Root cause stated OR the strongest hypothesis labelled as such
- [ ] Fix surface classified (`reversible-no-prod` | `production-or-irreversible`)
