---
adr: 0137
title: "Executive management surface — how a C-suite agent manages its reports within the delegate-only ceiling"
status: accepted
date: 2026-06-29
repo: frontend
summary: "Defines what 'manage your reports' means for a delegate-only C-suite agent (ADR-0131), so all five execs inherit one shape instead of re-deciding it. A C-suite manager (1) is AWARE of every report's autonomy rung — agent_autopilot_policy is a declared read room — but the dial-CHANGE recommendation stays the CRO's lane; (2) manages by performance through a division-performance-review oversight workflow that scores each report against the BUSINESS outcome it owns, reading the run ledger + eval results + dial via broad pg.read and rolling a scorecard to its human; (3) routes a business gap by delegating to the owning report, and HANDS a governance/eval-quality/risk/dial concern up to the CRO/Vera/Tess — it never adjudicates one. No new tool: the surface is read + delegate + handoff, so the delegate-only ceiling is untouched. The canonical metric layer (effectiveness-metric catalog + BI rollup) is deferred to a platform epic that later swaps the ad-hoc computation for canonical metrics."
tags: [agents, executive, management, autonomy, observability]
---

# ADR-0137: Executive management surface

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-29 |
| **Cross-references** | ADR-0131 (Executive-Suite tier — the delegate-only budget this extends) · ADR-0087 (orchestration + observability; "every tier reads its rung") · ADR-0128 (autonomy ladder) · ADR-0109 (the dial) · ADR-0086 (OKF rooms) · ADR-0106 (eval plane) |

## Problem

ADR-0131 makes a C-suite agent **delegate-only**: its `room.yaml` grants `{pg.read,
knowledge.search, memory.recall, delegate, handoff}` and no actuation tool, so the
L2 ceiling is structural. That settles what an executive *cannot do*. It leaves open
what an executive *can do to **manage** its reports* — and a manager who can only
delegate a task is not actually managing. Concretely, Sterling (Deputy CFO) runs six
reports (Chase, Belle, Celeste, Vance, Audrey, Bridget). To manage them he must be
able to **see how each is performing**, **act on a shortfall**, and **escalate what
isn't his to fix** — all without breaching the delegate-only ceiling and without
colliding with the platform-governance agents (Vera, Tess, the CRO Jessica) who also
watch agents. Authored ad hoc per executive, this would diverge five ways. It needs
one shape, inherited.

## Decision

A C-suite agent's **management surface** has three parts, all inside the
delegate-only ceiling (no new tool):

### D1 — Awareness of the dial (read), not governance of it

An executive declares `agent_autopilot_policy` (the autonomy dial) as a **read**
`okf_room` and is therefore **aware of the autonomy rung every report runs at**
("every tier reads its rung", ADR-0087). It uses the rung as operational context for
its briefs (e.g. "Audrey is at `draft`, so all dunning parks — that is the collections
drag"). It **does not recommend a rung change**: autonomy is data, admin-only
(CONSTITUTION §5.5), and dial governance is the **CRO's lane** (Jessica). The
executive surfaces the operational effect and hands off; the dial decision is made
elsewhere. Reading ≠ governing.

### D2 — Manage by performance, via a division-performance-review workflow

Each executive owns a scheduled **`division-performance-review`** oversight workflow
that scores **each report against the business outcome it owns** — pipeline moved,
demand generated, renewals held, spend controlled, AR cleared, partner ROI earned —
not against raw activity. It reads the **run ledger** (`agent_run`), **eval results**
(`agent_eval_result`), and the **dial** (`agent_autopilot_policy`) via broad
`pg.read` (the first two are Observability horizontals, not okf_rooms; the dial is a
declared room per D1), correlates them against the business silver the report is
supposed to move, and rolls a **scorecard** up to its paired human. This is a
**manager's** lens — *"is my division doing the business?"* — deliberately distinct
from the platform-governance lens *"are the agents healthy / compliant / safe?"*,
which is Vera (conformance/telemetry), Tess (service-quality), and Jessica (CRO —
risk + the dial).

### D3 — Route by kind: delegate a business gap, hand off a governance concern

The review separates two kinds of flag and routes them differently:

- A **business gap** (a report not advancing its outcome) → `delegate()` the
  corrective to the **owning report**, which acts under its own gauntlet.
- A **governance / eval-quality / risk / dial concern** (sliding eval scores, a
  mis-set dial, conformance drift) → `handoff()` to **Jessica** (or Vera / Tess as the
  lens fits). The executive **never adjudicates** it and never recommends a rung.

The performance-management **feedback model** is therefore **observe-and-route**: the
executive observes, delegates a business corrective, and escalates everything else to
a human or the platform-governance lane. It gets **no workflow-tune and no dial-flip
tool** — that would breach delegate-only.

## Options considered

1. **Give executives a richer management capability** (a `feedback`/coaching-note
   emit, or dial-set authority). Rejected: it breaches the ADR-0131 delegate-only
   ceiling and duplicates the CRO's dial lane. Observe-and-route preserves the
   structural ceiling.
2. **Leave management implicit** (executives just delegate tasks). Rejected: that is
   routing, not managing — no visibility into report performance, no place for the
   dial, no defined seam with the governance agents.
3. **Build the canonical metric layer first** (effectiveness-metric catalog + BI
   rollup, the org-recast follow-on). Deferred, not rejected: the division-performance
   workflow computes the scorecard **ad hoc** from existing signals today; a later
   **platform epic** introduces canonical metric definitions rolled up `reports_to`
   and the workflow swaps ad-hoc computation for them. The instrument ships now; the
   canonical backing follows.

## Consequences

- **Security / autonomy:** no new actuation surface. The management surface is read +
  delegate + handoff; the delegate-only ceiling and `icm-conformance`
  `checkExecutiveDelegateOnly` are untouched. Dial changes remain admin-only and the
  CRO's lane.
- **Inheritance:** all five C-suite agents (and, shaped one level up, Nova) get the
  **same** management surface — `agent_autopilot_policy` read + a
  `division-performance-review` workflow + the delegate-vs-handoff routing rule. This
  ADR is authored against Sterling (Deputy CFO) as the worked instance and replicated
  across Rachel/Dexter/Roman/Jessica in the executive sweep.
- **Seam:** the manager lens (business outcome) and the governance lens (agent health)
  are explicitly separated, so the executive review does not duplicate or contend with
  Vera / Tess / the CRO risk sweep.
- **Deferred:** the canonical effectiveness-metric catalog + BI rollup + the
  app-use feedback loop remain a platform epic (org-recast follow-on items 3/4/5).
