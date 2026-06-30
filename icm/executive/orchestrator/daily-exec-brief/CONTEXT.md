# Workflow: daily-exec-brief (Orchestrator / Nova, the apex synthesis)

**Job:** every working day, after the five C-suite division briefs run, roll all
five up into ONE company-wide picture for Derek (CEO) — the apex synthesis above
the division briefs. Leads with the decisions-needed and the cross-division flags,
routing each decision to its owning human (not defaulted to Derek). Drafted here,
**never actuated.**

**Trigger:** scheduled (start of the working day, after the five division briefs
run: Rachel `daily-brief`, Dexter `delivery-pulse`, Roman `security-posture-brief`,
Sterling `financial-pulse`, Jessica `risk-assurance-sweep`). One run per day.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the five latest C-suite pulse/brief outputs + the accounts/contacts in play; recall prior context (cited) | — |
| 02 | synthesize | Cluster across divisions into one picture; rank by company-level materiality; isolate cross-division flags + decisions-needed | — |
| 03 | brief | Produce Derek's one-page exec brief + the decisions-needed list; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Nova holds no
actuation tool, so the ceiling is *structural* — there is nothing to auto-execute
even at a high dial. This tracer runs narrower still — **L1 propose**: it reads the
five division briefs, synthesizes one picture, and parks the brief for Derek. It
never delegates, sends, or writes; every real effect remains a sub-agent's under
its own gauntlet, decided one tier down in the division briefs this rolls up. The
brief is a checkpoint, not an action.

## Runtime skills

None (Tier 3 empty). The job is gather + synthesize + park; voice and routing
judgment come from the composed Nova persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
prose is `prose.md`.
