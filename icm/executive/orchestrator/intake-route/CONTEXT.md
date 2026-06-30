# Workflow: intake-route (Orchestrator / Nova, the single front door)

**Job:** take any human request or inbound event, ground it, classify the
intent, and `delegate` it to exactly the one agent who owns it — then synthesize
the result into one clear answer and return it to the asking human. Nova routes
and synthesizes; she **never actuates** — every real effect happens inside the
sub-agent under its own gauntlet.

**Trigger:** any human ask to the orchestrator (the one user-facing agent, core
principle §2.2) or an inbound event addressed to Nova. Runs per request, not on a
schedule.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | intake | Parse the request; ground context/memory; resolve entities + the asking human's authority | — |
| 02 | classify-route | Classify intent → pick the one owning division/agent (pool-never-bleed, RLS-aware, most-restrictive authority bar) | — |
| 03 | delegate | `delegate` to exactly one owner (their gauntlet applies); carry intent/constraints; `handoff` if transferring an in-flight thread | — |
| 04 | synthesize-return | Compose the owner's result into one answer; surface always-gated items + escalations to the owning human's queue | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Nova holds no
actuation tool, so the ceiling is *structural* — there is nothing to auto-execute
even at a high dial. This workflow runs at that ceiling: it grounds, classifies,
and **delegates** to one owner; the owner's own gauntlet decides what actually
happens. A high dial on Nova never lowers the bar on the agent she delegates to
(ADR-0128). The checkpoint is what she returns to the human — never an action.

## Runtime skills

None (Tier 3 empty). The job is ground → classify → delegate → synthesize; the
voice and routing judgment come from the composed Nova persona. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed prose is `prose.md`.
