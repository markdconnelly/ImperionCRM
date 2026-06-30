# Workflow: division-intake (Deputy CFO / Sterling, the division's pull-side router)

**Job:** receive a unit of work Nova delegated to the Revenue/Client/Finance
division and route it to the **one** report who owns it — Chase (pipeline/new
sales), Belle (demand/marketing), Celeste (existing-account success), Vance
(procurement/vendor), Audrey (close/AR/AP/billing/time/expense), or Bridget
(partnerships). Sterling routes and synthesizes; he **never actuates** and finance
stays read-only — every real effect happens inside the report under its own
gauntlet. This is the division-tier mirror of Nova's `intake-route` (the #1666
pull side of hierarchical routing: Nova → exec → worker).

**Trigger:** a unit `delegate`d to Sterling by Nova's `intake-route` (or a
cross-division conflict routed here). Runs per delegated unit, not on a schedule.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | receive | Take Nova's delegated unit + carried intent/constraints/authority; confirm it belongs to this division; ground the minimal finance/revenue context | — |
| 02 | classify-route | Map the intent to exactly one report (pool-never-bleed, RLS-aware, most-restrictive authority bar); flag ambiguity as a conflict, not a guess | — |
| 03 | delegate | `delegate` to that one report (their gauntlet applies); carry intent + constraints; `handoff` if transferring an in-flight thread | — |
| 04 | synthesize-return | Compose the report's result back up to Nova; surface always-gated items (money, commitments) to Nick's queue | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Sterling holds no
actuation tool and finance is read-only (QBO is SoR, ADR-0123), so the ceiling is
*structural*. This workflow runs at that ceiling — it receives, classifies, and
**delegates** to one report; the report's own gauntlet decides what happens, and
money/pricing/commitments stay always-gated at the report tier (never Sterling's
lever). A high dial on Sterling never lowers a report's bar (ADR-0128). The
checkpoint is the result/route returned to Nova — never an action.

## Runtime skills

None (Tier 3 empty). The job is receive → classify → delegate → synthesize; the
routing judgment comes from the composed Sterling persona (his division seams).
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
