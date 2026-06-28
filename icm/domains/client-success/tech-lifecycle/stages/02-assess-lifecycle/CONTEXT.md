# Stage 02 — assess-lifecycle

**Job:** identify EOL / aging / at-risk assets, labeling measured signal vs inference.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Estate context | `estate-context.md` (stage 01 output) | full | the relationship + service standing + supplied asset evidence |
| Lifecycle rubric | `./skills/lifecycle-rubric.md` | all | how to read EOL/aging + the signal-vs-inference discipline |
| Service signal | silver `ticket` · `okf:ticket` | recent for this account | corroborate named-asset incident patterns |

## Process

1. `[sonnet]` Identify the EOL, aging, and at-risk assets per `lifecycle-rubric.md`. For
   every verdict, **label measured signal vs your inference** — an EOL flag carries the fact
   that produced it (celeste.md guardrail 3). Where the asset detail is a handoff rather than
   a measured row, mark it `handoff` so its provenance stays visible.
2. `[sonnet]` Note the client-risk for each candidate (security exposure, reliability,
   posture gap) — security findings are **advisory only** (MSSP boundary; remediation is
   human / Datto). Corroborate with the service history (`ticket`); never invent an asset, an
   age, an EOL date, or a risk.
3. `[script]` Produce the at-risk asset list: each item with its lifecycle status, its
   signals (sourced / `handoff`-marked), and its client-risk reading. If the estate is
   unknown (stage 01), record that and park — nothing to assess.

## Outputs

`lifecycle-assessment.md` — the EOL / aging / at-risk asset list, each item carrying its
lifecycle status, the signals that produced it (measured vs inference labeled, handoff-marked
where supplied), and its client-risk reading. Security items flagged advisory-only.

## Audit

- [ ] Every lifecycle verdict labels measured signal vs inference
- [ ] Handoff-sourced asset facts are marked `handoff` (provenance visible)
- [ ] No asset / age / EOL date invented (only supplied or sourced facts)
- [ ] Security findings are advisory-only (no remediation proposed as a CS action)
