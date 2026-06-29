# Workflow: governance-oversight (Orchestrator / Nova, the autonomy-posture watch)

**Job:** on a schedule, scan the autonomy posture of the whole agent org and
surface what needs a human's attention — agents whose `auto` dial sits high
relative to their risk, items aging in the pending-approval (gate) queues,
kill-switch state, and anomalies in the agent-run ledger — into one governance
oversight brief for Mark (CISO / governance owner). Nova **reads and surfaces
only**: she proposes nothing be auto-changed and flips no dial.

**Trigger:** scheduled (start of day / weekly governance cadence). One run per
cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | scan | Read the dial/autopilot config + the agent-ops ledger (gate backlog + ages, kill-switch state, recent agent_run health); recall prior cycle (cited) | — |
| 02 | assess | Flag the governance risks — high dial vs. risk, gates aging past threshold, kill-switch engaged/partial, run-ledger anomalies; rank by exposure | — |
| 03 | surface | Produce Mark's oversight brief — each flag = posture + exposure + the human decision it implies; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Nova holds no
actuation tool, so the ceiling is *structural* — there is nothing to auto-execute
even at a high dial. This tracer runs narrower still — **L1 propose**: it reads
the dial state, the gate backlog, the kill-switch, and the run ledger, synthesizes
the governance picture, and parks the brief for Mark. It **observes the dial; it
never sets it** — flipping an autonomy dial, engaging or releasing a kill-switch,
and changing a policy are human acts (ADR-0128), never this tracer's. The
framework owns the state machine; the agent only reads its state and reports it.
It never delegates, sends, or writes; the brief is a checkpoint, not an action.

## Runtime skills

None (Tier 3 empty). The job is scan + assess + surface + park; voice and
governance judgment come from the composed Nova persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
prose is `prose.md`.
