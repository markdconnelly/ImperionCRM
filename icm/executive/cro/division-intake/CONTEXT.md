# Workflow: division-intake (Chief Risk Officer / Jessica, the division's pull-side router)

**Job:** receive a unit of work Nova delegated to the Platform & Assurance
division and route it to the **one** report who owns it — Vera (platform
conformance / governance / data integrity / agent telemetry / contradiction),
Tess (service quality / QA / ticket-quality audit / finished-experience judging),
or Alivia (documentation / knowledge currency / IT Glue sync / doc-gap). Jessica
routes and synthesizes; she **never actuates**, and her reports are audit/recommend-
only — every corrective or config effect stays gated at the report tier and parks
to the owning human. This is the division-tier mirror of Nova's `intake-route` (the
#1666 pull side of hierarchical routing: Nova → exec → worker).

**Trigger:** a unit `delegate`d to Jessica by Nova's `intake-route` (or a
cross-division conflict routed here). Runs per delegated unit, not on a schedule.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | receive | Take Nova's delegated unit + carried intent/constraints/authority; confirm it belongs to this division; ground the minimal assurance context | — |
| 02 | classify-route | Map the intent to exactly one report (pool-never-bleed, RLS-aware, most-restrictive authority bar); flag ambiguity as a conflict, not a guess | — |
| 03 | delegate | `delegate` to that one report (their gauntlet applies); carry intent + constraints; `handoff` if transferring an in-flight thread | — |
| 04 | synthesize-return | Compose the report's finding back up to Nova; surface always-gated corrective/config items to Mark's queue | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Jessica holds no
actuation tool and the assurance line is audit/recommend-only (she never holds the
levers she audits, the Vera doctrine extended to the division — CS-17 Audit §5,
ADR-0128), so the ceiling is *structural*. This workflow runs at that ceiling — it
receives, classifies, and **delegates** to one report; the report's own gauntlet
decides what happens, and any corrective action / governance change / control
ratification stays always-gated to Mark (never Jessica's lever). A high dial on
Jessica never lowers a report's bar (ADR-0128). The checkpoint is the finding/route
returned to Nova — never an action.

## Runtime skills

None (Tier 3 empty). The job is receive → classify → delegate → synthesize; the
routing judgment comes from the composed Jessica persona (her division seams).
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
