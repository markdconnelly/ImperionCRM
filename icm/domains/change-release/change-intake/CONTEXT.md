# Workflow: change-intake (change-release v1)

**Job:** every proposed change arrives risk-scored, scheduled, reversible, and
communicated — assembled into a decision-ready package and **parked for approval**.
This workflow is a gate; it never approves or executes.

**Trigger:** a change is proposed (a Sage permanent fix, an operational change from
Felix/Ozzie, or a scheduled release). One run per change.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | assess | Risk-score the change against its CIs + blast radius | — |
| 02 | plan | Schedule + rollback plan + client-comms draft | — |
| 03 | park-for-approval | Assemble the change record; PARK for human approval | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 tracer runs at **L1**; Marshall's ceiling is L2
and the domain is a **gate** — there is no rung at which a change auto-approves or
auto-executes. When flipped to `auto` (up to L2) it may self-approve ONLY writing
the internal change-record draft. The change **approval and execution always park**
for a human, in every mode — dial-proof (CONSTITUTION §5.4).

## Runtime skills

None at v1 (`skills: []`). The risk-scoring matrix, the maintenance-window
calendar, and the rollback/comms templates arrive as workflow-local Tier-3 skills.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed workflow prose is `prose.md`.
