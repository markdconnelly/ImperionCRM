# Workflow: quality-eval-oversight (Chief Risk Officer / Platform & Assurance, executive)

**Job:** on a schedule, roll the eval plane and service-quality signals — golden pass
rates vs baselines, agents with no or thin golden coverage, score regressions — into a
quality brief for Mark, leading with the regressions and the coverage gaps, and where
a quality signal is grounded, delegate the *observation* to Tess. Jessica never edits
a golden, moves a baseline, or re-scores a run.

**Trigger:** scheduled (start of the working day / week). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull eval cases/runs + baselines, Tess's run-ledger / handoff signals, accounts in scope | — |
| 02 | synthesize | Compute pass rates vs baseline, rank regressions, isolate coverage gaps | — |
| 03 | brief | Produce Mark's quality/eval brief + the regression/gap flags; park | **Yes** |
| 04 | delegate-followups | Emit a proposed delegate to Tess (observation only) / handoff to Nova; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): the executive tier grants
no actuation tool, and the assurance line **never holds the levers it audits**
(`../room.md`). This workflow runs at that ceiling — it reads, synthesizes, parks the
brief for Mark, and may emit a **proposed** `delegate()` to Tess for grounded quality
observation (never a fix, never a re-score) or a `handoff()` to Nova when the signal
is cross-division. Golden edits, baseline moves, and threshold changes are governance
changes — always-gated to Mark. Delegate and handoff route work — they do not actuate.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice, independence,
and audit-by-reference come from the composed Jessica persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
