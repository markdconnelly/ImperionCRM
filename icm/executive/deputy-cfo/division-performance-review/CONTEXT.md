# Workflow: division-performance-review (Deputy CFO / Revenue & Finance, executive oversight)

**Job:** on a schedule, review how each of Sterling's direct reports (Chase,
Belle, Celeste, Vance, Audrey, Bridget) is performing **against its business
mandate** — is the agent advancing the revenue/client/finance outcome it owns —
and brief Nick with a per-report scorecard, delegating a corrective where the gap
is a business one and handing a governance concern up where it is not.

**Trigger:** scheduled (weekly / start of cycle). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull each report's activity (run ledger), eval results, autonomy rung, and the business outcome it owns | — |
| 02 | synthesize | Build a per-report business-outcome scorecard; separate a business gap from a governance/quality/risk concern | — |
| 03 | brief | Produce Nick's division scorecard + the flags; park | **Yes** |
| 04 | route-followups | Delegate a business corrective to the report; hand a governance concern up to Jessica/Vera/Tess | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Sterling holds no
actuation tool. This is a **management-by-performance** oversight workflow — it
reads the run ledger (`agent_run`), eval results, and each report's autonomy rung
(`agent_autopilot_policy`, "every tier reads its rung", ADR-0087) via broad
`pg.read`, correlates them against the business outcome the report owns, and rolls
a scorecard up to Nick. It **never** changes a dial, tunes a workflow, or actuates
(autonomy is data, admin-only, §5.4/§5.5). A business gap is delegated to the
owning report; a governance / eval-quality / risk / dial concern is **not Sterling's
to adjudicate** — it hands off to Jessica (CRO) / Vera / Tess. The scorecard is a
checkpoint, not an action.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + route; voice and guardrails come
from the composed Sterling persona. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
