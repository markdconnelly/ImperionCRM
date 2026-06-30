# Workflow: division-intake (Deputy CISO / Roman, the division's pull-side router)

**Job:** receive a unit of work Nova delegated to the Security & Compliance
division and route it to the **one** report who owns it — Cyrus (SOC: threat
detection / alerts / incident containment), Grace (GRC: posture / control
evidence / control-gaps / audit readiness / compliance), or Osiris (identity:
access / joiner-mover-leaver / least-privilege). Roman routes and synthesizes; he
**never actuates** — every real effect happens inside the report under its own
gauntlet, and identity / destructive / client-facing security actions stay
always-gated at the report tier. This is the division-tier mirror of Nova's
`intake-route` (the #1666 pull side of hierarchical routing: Nova → exec → worker).

**Trigger:** a unit `delegate`d to Roman by Nova's `intake-route` (or a
cross-division conflict routed here). Runs per delegated unit, not on a schedule.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | receive | Take Nova's delegated unit + carried intent/constraints/authority; confirm it belongs to this division; ground the minimal security context | — |
| 02 | classify-route | Map the intent to exactly one report (pool-never-bleed, RLS-aware, most-restrictive authority bar); flag ambiguity as a conflict, not a guess | — |
| 03 | delegate | `delegate` to that one report (their gauntlet applies); carry intent + constraints; `handoff` if transferring an in-flight thread | — |
| 04 | synthesize-return | Compose the report's result back up to Nova; surface always-gated items (containment, identity/access change) to Mark's queue | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Roman holds no
actuation tool (gate allow-list `{pg.read, knowledge.search, memory.recall,
delegate, handoff}`), so the ceiling is *structural*. This workflow runs at that
ceiling — it receives, classifies, and **delegates** to one report; the report's
own gauntlet decides what happens, and any destructive/client-facing containment
or identity/access change stays always-gated at the report tier (never Roman's
lever). A high dial on Roman never lowers a report's bar (ADR-0128). The
checkpoint is the result/route returned to Nova — never an action.

## Runtime skills

None (Tier 3 empty). The job is receive → classify → delegate → synthesize; the
routing judgment comes from the composed Roman persona (his division seams).
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`. This workflow ships per #1666 with
its goldens (a grounding/no-fabrication case and a park-or-delegate guardrail) per
CONVENTIONS Goldens rule.
