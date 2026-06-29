# Stage 03 — flag

**Job:** surface anomalies and stale sources for a human as advisory flags — read-and-flag
only, no actuation.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Synthesis | stage 02 output | the window | the unioned + attributed result set |
| Gathered readings | stage 01 output | the window | the stale-collector flags to carry through |
| Campaign spine | `` `okf:campaign` `` | in-scope campaigns | naming the owning campaign per flag |

## Process

1. `[sonnet]` Detect anomalies in the synthesized result set: under-performing channels /
   campaigns (CPL / CAC / ROAS off target), spend-pace outliers, attribution gaps. Cite the
   figure + as-of behind each flag (A5).
2. `[script]` Carry the stage-01 stale-collector flags through into the same surface so a
   stale source reads as stale, not as a real anomaly.
3. `[script]` Emit the flag set as **advisory only** — name the owning procedure a human may
   route each to (under-performer → 01-C re-budget / 01-L re-plan; stale source → collector
   owner). **No actuation here:** this stage opens no action, writes no silver, sends nothing.

## Outputs

`flags.md` — the advisory anomaly + stale-source flags, each with its citing figure + as-of
and the suggested owning procedure for a human to route — and nothing actuated.

## Audit

- [ ] Each anomaly flag cites its figure + as-of (A5)
- [ ] Stale-collector flags carried through and labeled stale, not anomaly
- [ ] Every flag is advisory + names a human-routed owning procedure — nothing actuated
- [ ] No send, no silver write, no action opened (read-and-flag only)
