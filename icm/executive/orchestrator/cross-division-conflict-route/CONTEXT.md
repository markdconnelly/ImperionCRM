# Workflow: cross-division-conflict-route (Orchestrator / Nova, the owner-conflict arbiter)

**Job:** take a request that `intake-route` flagged as a cross-division conflict
— ambiguous ownership, or genuinely spanning ≥2 divisions — arbitrate the **single**
owning division/agent using documented ownership rules plus the most-restrictive
authority bar, and route it: `delegate` to the one owner when the rules yield a clear
winner, or **park** the decision to the owning human's queue when the call is genuinely
theirs. Nova arbitrates and routes; she **never actuates** — every real effect happens
inside the owning sub-agent under its own gauntlet. This is the conflict-handling sibling
of `intake-route` and implements the #968 owner-conflict decision.

**Trigger:** a conflict raised by `intake-route` stage 02 (a flagged ambiguous/spanning
request), or any escalation where ≥2 divisions could own a unit of work. Runs per
conflict, not on a schedule.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | intake-conflict | Receive the conflicted request + the candidate owners from intake-route; ground the entities + the asking human's authority (cite); record why it is a conflict | — |
| 02 | arbitrate | Apply ownership rules to pick the ONE owning division/agent (primary-effect-wins, SoR-write-wins, security/risk defers to Roman/Jessica); apply the most-restrictive authority bar; hold pool-never-bleed; mark park-for-human when the decision itself is the human's | — |
| 03 | route | `delegate` to exactly the one owner (their gauntlet applies) carrying intent + constraints, OR park the decision to the owning human's single queue; surface the arbitration rationale | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Nova holds no actuation
tool, so the ceiling is *structural* — there is nothing to auto-execute even at a high
dial. This workflow runs at that ceiling: it arbitrates the conflict and **delegates** to
the one owner it picks (or parks the decision to a human); the owner's own gauntlet
decides what actually happens. A high dial on Nova never lowers the bar on the agent she
delegates to (ADR-0128). The checkpoint is the route/park she returns — never an action.
The arbitration itself is the #968 owner-conflict decision: when ownership is contested
the rules pick one owner, and a genuinely contested call goes to the owning human rather
than being guessed.

## Runtime skills

None (Tier 3 empty). The job is ground → arbitrate → route; the ownership rules and the
arbitration judgment come from the composed Nova persona and the org tree. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
prose is `prose.md`.
