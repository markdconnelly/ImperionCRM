# Workflow: release-readiness-check (change-release v1)

**Job:** before a normal/emergency change proceeds, verify the 0224 governance
gates — an APPROVED rollback plan exists, the schedule window does NOT overlap an
ACTIVE freeze, and (informationally) whether the change matches a standard-change
template — then produce a **readiness verdict** and PROPOSE the next step,
**parked for a human**. This workflow is a gate; it never approves, schedules, or
executes.

**Trigger:** a `change_request` (typically `normal` | `emergency`) is heading
toward approval/scheduling and Marshall is asked whether its governance gates are
met. One run per change.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather-change | Resolve the change + its rollback plan, freeze calendar, and any matching template | — |
| 02 | evaluate-gates | Test each gate: approved rollback? freeze overlap? template match? | — |
| 03 | verdict-propose | Produce the readiness verdict + proposed next step; PARK for a human | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 workflow runs at **L1**; Marshall's ceiling is
L2 and the domain is a **gate** — there is no rung at which a change auto-approves,
auto-schedules, or auto-executes. When flipped to `auto` (up to L2) it may
self-approve ONLY writing the internal readiness-verdict work-note. The change
**approval, the scheduling, and the execution always park** for a human, in every
mode — dial-proof (CONSTITUTION §5.4). A **freeze-window overlap is a hard
`always_gate` block** at every rung (change_freeze: an overlap with an active
window is the block).

## Runtime skills

None at v1 (`skills: []`). The gate-evaluation rules are grounded directly in the
0224 governance concepts (change_request · change_freeze · rollback_plan ·
standard_change_catalog) per ADR-0079; if a reusable readiness-rule skill emerges
it promotes per the tier rules. Rules of the format: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
