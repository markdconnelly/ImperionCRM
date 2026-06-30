# Workflow: division-intake (Chief of Staff / Rachel, the division's pull-side router)

**Job:** receive a unit of work Nova delegated to the Internal Ops / G&A division
and route it to the **one** report who owns it — Holly (people / HR / employee
lifecycle) or Laurel (legal / contracts). Rachel routes and synthesizes; she
**never actuates** — every real effect happens inside the report under its own
gauntlet, and anything binding (a signed contract, an employment/comp decision)
parks for the owning human. This is the division-tier mirror of Nova's
`intake-route` (the #1666 pull side of hierarchical routing: Nova → exec → worker).

**Trigger:** a unit `delegate`d to Rachel by Nova's `intake-route` (or a
cross-division conflict routed here). Runs per delegated unit, not on a schedule.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | receive | Take Nova's delegated unit + carried intent/constraints/authority; confirm it belongs to this division; ground the minimal people/legal context | — |
| 02 | classify-route | Map the intent to exactly one report (pool-never-bleed, RLS-aware, most-restrictive authority bar); flag ambiguity as a conflict, not a guess | — |
| 03 | delegate | `delegate` to that one report (their gauntlet applies); carry intent + constraints; `handoff` if transferring an in-flight thread | — |
| 04 | synthesize-return | Compose the report's result back up to Nova; surface always-gated items (a binding contract, an employment/comp decision) to Derek's queue | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Rachel holds no
actuation tool, so the ceiling is *structural*. This workflow runs at that ceiling —
it receives, classifies, and **delegates** to one report; the report's own gauntlet
decides what happens, and anything binding (a signed contract) or personal (an
employment/comp decision, salary/comp data) stays always-gated at the report tier
(never Rachel's lever). A high dial on Rachel never lowers a report's bar (ADR-0128).
The checkpoint is the result/route returned to Nova — never an action. Built for #1666.

## Runtime skills

None (Tier 3 empty). The job is receive → classify → delegate → synthesize; the
routing judgment comes from the composed Rachel persona (her division seams).
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
