# Stage 02 — detect-drift

**Job:** compare the read posture against the expected baseline and classify each
finding as drift, degradation, or within-baseline, producing the evidence chain a
proposal rests on.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Posture read | stage 01 `posture-read.md` | full | the current posture + resolved assets |
| Expected baseline | knowledge search (posture-baseline knowledge) over gold | the client's baseline controls/posture | the comparison reference |
| Asset health | silver `device` / `cloud_asset` · `okf:device` `okf:cloud_asset` | the read CIs' health facts | confirm which CIs drifted |

## Process

1. `[script]` Carry the read posture facts and resolved asset/account ids forward.
2. `[sonnet]` Pull the expected baseline via `knowledge.search`; cite each baseline
   item (no uncited baseline claims).
3. `[script]` Diff current posture facts and `device`/`cloud_asset` health against the
   cited baseline; list each delta (reference facts only, no PII).
4. `[sonnet]` Classify each delta: `drift` (configuration moved off baseline) |
   `degradation` (a control weakened/expired) | `within-baseline`, one sentence of
   reasoning per finding citing the posture fact that moved. Assemble the evidence
   chain: baseline → current fact → finding.

## Outputs

`drift-findings.md` — the cited baseline, the per-finding classification with reasoning,
and the evidence chain. Drives the stage-03 propose decision. A run with only
`within-baseline` findings carries a clean-posture note forward.

## Audit

- [ ] Every baseline claim carries a citation (no uncited comparison)
- [ ] Each delta has exactly one classification with one sentence of reasoning
- [ ] No client PII or secret material in the record (audit-by-reference)
