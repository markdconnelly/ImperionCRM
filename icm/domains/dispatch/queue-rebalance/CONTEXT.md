# Workflow: queue-rebalance (dispatch v1)

**Job:** periodically read the open/unassigned ticket queue and current
assignments, detect imbalance and SLA-at-risk tickets (aging, breaching
priority), and PROPOSE a rebalanced assignment set — never actuating. Scout's
proactive complement to the reactive `dispatch-assign`. Thin: leans on Autotask
native dispatch as the system of record.

**Trigger:** a scheduled cadence sweep of the dispatch queue (not a single
onsite flag). One run per sweep over the open queue, not per ticket.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | read-queue | Read the open/unassigned queue + current assignments | — |
| 02 | detect-imbalance | Detect load imbalance + SLA-at-risk tickets | — |
| 03 | propose-rebalance | Propose the rebalanced set; every reassignment parks | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 workflow runs at **L1**; Scout's ceiling is L3.
When flipped to `auto` it may self-approve ONLY writing the internal
rebalance-analysis work-note (the finding + the proposed set). **Every
reassignment proposal — and any notify — always parks** for a human, in every
mode — dial-proof (CONSTITUTION §5.4). Scout proposes a rebalance; he never moves
a ticket between technicians on his own.

## Runtime skills

None at v1 (`skills: []`). The technician load/SLA matrix and the
availability/calendar lookup arrive as workflow-local Tier-3 skills (or via the
Autotask dispatch integration) when the L2 internal-note rung is dialled on.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed workflow prose is `prose.md`.
