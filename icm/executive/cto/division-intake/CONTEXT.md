# Workflow: division-intake (CTO / Dexter, the division's pull-side router)

**Job:** receive a unit of work Nova delegated to the Service Delivery &
Engineering division and route it to the **one** report who owns it — Felix
(front-line ticket triage/resolution), Ozzie (monitoring/alerts/alert patterns),
Sage (recurring-incident root cause / tier-3), Marshall (change/release
governance/fallback), Scout (technician scheduling/onsite dispatch), Phoenix
(backups/recovery/DR readiness), or Pierce (project delivery/PM/onboarding-
provisioning). Dexter routes and synthesizes; he **never actuates** — every real
effect happens inside the report under its own gauntlet. This is the division-tier
mirror of Nova's `intake-route` (the #1666 pull side of hierarchical routing:
Nova → exec → worker).

**Trigger:** a unit `delegate`d to Dexter by Nova's `intake-route` (or a
cross-division conflict routed here). Runs per delegated unit, not on a schedule.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | receive | Take Nova's delegated unit + carried intent/constraints/authority; confirm it belongs to this division; ground the minimal delivery context | — |
| 02 | classify-route | Map the intent to exactly one report (pool-never-bleed, RLS-aware, most-restrictive authority bar); flag ambiguity as a conflict, not a guess | — |
| 03 | delegate | `delegate` to that one report (their gauntlet applies); carry intent + constraints; `handoff` if transferring an in-flight thread | — |
| 04 | synthesize-return | Compose the report's result back up to Nova; surface always-gated items (production change, destructive/identity action) to Luke's queue | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Dexter holds no
actuation tool, so the ceiling is *structural*. This workflow runs at that ceiling
— it receives, classifies, and **delegates** to one report; the report's own
gauntlet decides what happens, and production-affecting / destructive / identity
actions stay always-gated at the report tier (never Dexter's lever). A high dial on
Dexter never lowers a report's bar (ADR-0128). The checkpoint is the result/route
returned to Nova — never an action.

## Runtime skills

None (Tier 3 empty). The job is receive → classify → delegate → synthesize; the
routing judgment comes from the composed Dexter persona (his division seams).
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
