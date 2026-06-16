# 🤖 Agents

**One agent experience.** The user talks to a single orchestrator; many specialized
sub-agents exist internally but never address the user directly (CLAUDE.md §2, ADR-0004).

[← Documentation library](../README.md)

## The model

```mermaid
flowchart TD
    USER(["User"]) <--> ORC["Orchestrator agent<br/>routes · selects tools · enforces permissions · manages memory"]
    ORC --> CRM["CRM"]
    ORC --> SALES["Sales"]
    ORC --> PROP["Proposal"]
    ORC --> ONB["Onboarding"]
    ORC --> DOC["Documentation"]
    ORC --> ITG["IT Glue"]
    ORC --> AT["Autotask"]
    ORC --> M365["M365"]
    ORC --> REP["Reporting"]
    ORC -. scoped to .-> PERM["the user's Entra permissions"]
```

The orchestrator routes requests, selects tools, invokes sub-agents, manages context
and memory, **enforces permissions**, and returns one response. The AI stack is
**settled** (ADR-0043 / backend ADR-0034): **Claude** for generation (Haiku cheap tier,
Sonnet premium tier) + **Voyage `voyage-3-large` @ 1024** for embeddings.

## The orchestration & observability matrix (ADR-0087)

The single map of **every agent** — the five-tier taxonomy (Triage · Dispatch · Execute ·
Observe/Govern · Spine), each role's autonomy rung (one dial, stored in
`autopilot_policies`), the workflows + tools wired per tier, and the OKF concept files
each role loads: **[orchestration-matrix.md](orchestration-matrix.md)**.

## What belongs here

Every agent gets a dedicated doc: **identity · responsibilities · inputs · outputs ·
tool access · security boundaries · failure handling · a workflow diagram**. Start each
from this template and link it back here.

> Status: the orchestrator runtime is **live in the backend** (backend ADR-0036 — a
> Claude tool-use loop over the registered sub-agents, deterministic-triage fallback,
> every turn audited to `audit_log` as `agent.turn` with cost metering). Registered
> today: **Reporting** (read-only snapshot Q&A) and **Sales/Outreach** (approval-gated,
> consent-checked drafts), plus the `search_knowledge` tool over the gold store.
> The **Board runtime is live too** (backend ADR-0039) and the `/board` page is real
> (below).

## The AI Agents page (ADR-0048)

`/agents` is the operations surface for the agent layer:

- **Orchestrator card** — model-tier preset (economy / balanced / premium, each
  pinning the cheap+premium Claude pair) and the HARD monthly USD budget (blank =
  no cap) with month-to-date spend. Reads through the backend
  `GET /agent/settings`, falls back to a direct `agent_settings` read, then mock;
  saves only via the backend `PUT` behind the `settings:write` capability
  (admin-only, ADR-0045).
- **Cost telemetry rollups (#184, v1 gate 9)** — spend per metered process and per
  entity (per board session, per conversation; enrichment/send executors appear
  automatically as they land — anything auditing the ADR-0032 usage shape).
  Reads the backend `GET /agent/cost-rollup?month=YYYY-MM` (backend #65) through
  the #190 call-guard seam; no DB fallback by design (the rollup SQL lives in one
  place). Month totals strip + per-process `<details>` rows with the top-20
  entities by spend (board sessions link to `/board/[id]`); `?month=` browses
  past months. Degrades to a notice when the backend isn't configured.
- **Recent agent activity** — the last 20 `agent.turn` audit rows (time, actor,
  routed-to, routing reason, model turns, cost).

## The Board of Directors page (ADR-0049, backend ADR-0039)

`/board` is the AI Board of Directors — persona agents (`agent` rows with
`module='board'`; seeded CEO/CFO/COO/CMO/CISO, migration 0056) that deliberate a
convened topic in two rounds, after which a synthesis voice composes ONE board
recommendation. Personas read granted business context only and are **walled off
from CRM operational writes** (ADR-0049).

- **Convene card** — topic (≤2000 chars), optional context (≤8000), persona
  checkbox chips (default: the full board, max 5). Submitting calls the backend
  `POST /board/sessions` (the deliberation is synchronous, ~30–90s; the UI shows a
  "deliberating" pending state). Guarded by `sales:write` (ADR-0045 — convening is
  a business-development action that spends premium model budget; admins always
  may). Budget reached → a "board is paused" notice (backend ADR-0037's shared
  monthly ceiling); model unavailable → a persisted failed session, never a crash.
- **Sessions list + `/board/[id]` detail** — direct DB reads of the `board_*`
  tables (web identity has SELECT, migration 0056 / ADR-0042): members, the
  transcript grouped into rounds (the NULL-agent message is the synthesis voice),
  and the recommendation card (stances / agreements / disagreements parsed
  defensively from the rationale jsonb).
- **Degradation** — backend unset: convening disabled with a notice, lists still
  render from the DB; DB unset: personas fall back to `GET /board/agents`, lists
  to sample data. The page never throws.

The full agent record (workflow diagram, failure table, cost bounds) lives in the
backend repo: `ImperionCRM_Backend/docs/agents/board.md`.

Governing decisions:
[ADR-0004 single orchestrator](../decision-records/ADR-0004-single-orchestrator-agent-model.md) ·
[ADR-0015 agent platform & board](../decision-records/ADR-0015-agent-platform-and-board.md) ·
[ADR-0048 AI Agents operations page](../decision-records/ADR-0048-ai-agents-operations-page.md) ·
[ADR-0049 board runtime persistence](../decision-records/ADR-0049-board-runtime-persistence.md)
