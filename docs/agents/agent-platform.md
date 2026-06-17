# The agent platform & surfaces

How the orchestrator is shaped, persisted, and surfaced in Imperion Business
Manager. This is the **start-here** guide: the single orchestrator, its persisted
core, the sub-agent fleet, the operations page, and the in-app agent panel.

[← The AI suite](README.md) · Governing decision:
[ADR-0091](../decision-records/ADR-0091-agent-icm-platform-consolidated.md)
(from ADR-0004 / 0015 / 0029 / 0048 / 0049).

> **Cross-repo note.** This repo is the **GUI**. The orchestrator *runtime* lives
> in **ImperionCRM_Backend** (backend ADR-0036). The front end renders the
> surfaces, reads PostgreSQL for display, and routes every turn to the backend.
> Backend ADRs are referenced, never restated (system
> [CLAUDE.md §1](../../CLAUDE.md)).

---

## 1. The single-orchestrator model (ADR-0091 §1)

Users interact with **one orchestrator**. Sub-agents never interact with users
directly. The orchestrator:

- **routes** each request to the right sub-agent or tool,
- **selects tools** from the registered catalog,
- **invokes sub-agents** and composes their output,
- **manages context and memory** (the persisted `agent_memory` store),
- **enforces Entra-scoped permissions** — every action inherits the *acting
  user's* permission scope (ADR-0016), and
- **returns one response.**

This is the **single choke point for permission enforcement and audit**:
sub-agent tool access is gated centrally, so there is exactly one place to reason
about "what can the AI do as this user."

```mermaid
sequenceDiagram
    actor U as Employee
    participant P as Agent panel (this repo)
    participant O as Orchestrator (backend)
    participant S as Sub-agent
    participant K as Gold knowledge store
    participant L as agent_run / audit_log
    U->>P: ask a question
    P->>O: askAgentAction(message, actingUser.id)
    Note over O: resolve acting-user scope (ADR-0016)
    O->>S: route to sub-agent (Reporting / Sales / …)
    S->>K: search_knowledge (grounding)
    K-->>S: retrieved text + citations
    S-->>O: drafted answer / proposed action
    O->>L: write turn (tokens · cost_usd · routing reason)
    O-->>P: one response (+ requiresApproval if a send was drafted)
    P-->>U: render answer / approval notice
```

---

## 2. The persisted agent core (ADR-0091 §2, migration 0056)

The agent layer is **persisted in PostgreSQL** — materialized by
`db/migrations/0056_agent_core_and_board.sql`. This is the schema the whole suite
sits on:

| Table | Purpose |
|---|---|
| `agent` | One row per agent (instructions, `model_routing`, tool scope, `module` tag). Board personas are `module='board'` rows. |
| `agent_tool_grant` | The mechanical autonomy control — every tool a sub-agent can call carries a tier in its grant `scope`; the loop refuses calls above the grant (ADR-0055). |
| `agent_run` | **Append-only run ledger** — one row per run, the canonical record of *what · why · state · cost*. The one ledger across both planes (ADR-0087). |
| `agent_message` | Append-only per-turn messages: tokens, `cost_usd`, `acting_user_id`, `permission_scope`. |
| `agent_memory` | Agent memory in `pgvector` — `embedding vector(1024)` under the pinned vector contract (ADR-0041), HNSW cosine index, same provenance columns as `knowledge_embedding`. |

Two facts that trip people up:

- **`agent.model_routing` is a *tier hint***, not a hard-coded model. It carries
  `{"tier":"cheap"|"premium"}`; the concrete Claude models resolve through the
  `agent_settings` preset at runtime (ADR-0049). Re-pointing a tier is a settings
  change, not a code change.
- **Orchestrator audit lives in `audit_log` for now** (`agent.turn` rows). The
  *Board* runtime writes `agent_run` rows from day one; moving the CRM
  orchestrator's per-turn audit into `agent_run`/`agent_message` is a separate
  later change (ADR-0049 §6). Don't assume every CRM turn is in `agent_run` yet.

---

## 3. The sub-agent fleet

Sub-agents are internal specialists the orchestrator invokes. The front end
mirrors the backend's *actual* registrations on the `/agents` page —
`SUB_AGENTS` in `src/app/(app)/agents/page.tsx` is kept **in lockstep** with the
backend's `registerSubAgent(...)` calls, so the page shows only what is really
routable.

**Registered and live today:**

| Sub-agent | Tier | Badge | What it does |
|---|---|---|---|
| **Reporting** | Premium-tier synthesis | `read-only` | Answers questions over the live reporting snapshot (active/recurring revenue, open pipeline by stage, win rate, assessment→managed conversion, delivery time). Grounds every figure in the same aggregations the Reporting page shows; **never invents numbers.** |
| **Sales / Outreach** | Premium-tier drafting | `approval-gated` | Drafts consent-gated outbound email/SMS for a contact, grounded in their gold-layer history. It only ever **proposes** — the draft is queued for human approval, consent checked up front and re-asserted at execution. Nothing sends autonomously. |

**Registered tool:**

| Tool | What it does |
|---|---|
| `search_knowledge` | Semantic search over the gold knowledge store (accounts, contacts, contracts, tickets) — Voyage embeddings @ 1024 dims (ADR-0041/0043). The loop uses it to ground answers in company facts. See [knowledge-and-rag.md](knowledge-and-rag.md). |

The broader **target** fleet named in the architecture (CRM · Sales · Proposal ·
Onboarding · Documentation · IT Glue · Autotask · M365 · Reporting, system
[CLAUDE.md §2](../../CLAUDE.md)) is the design surface; the table above is what is
**registered and routable now**. New registrations appear here as the backend
lands them.

---

## 4. The AI Agents operations page — `/agents` (ADR-0091 §4)

`/agents` is the operator surface for the agent layer. It is **admin-only**
(`canSeeAgentPages`, ADR-0050).

```mermaid
flowchart LR
    PAGE["/agents page"] --> OSC["Orchestrator card<br/>preset · budget · spend"]
    PAGE --> CRC["Cost-rollup card<br/>per process · per entity"]
    PAGE --> ACT["Recent activity<br/>last 20 agent.turn rows"]
    OSC -->|read| RT["settings-data.ts:<br/>backend GET → DB SELECT → mock"]
    OSC -->|write| WR["saveAgentSettingsAction →<br/>backend PUT (settings:write)"]
    CRC -->|read| ROLL["cost-rollup-data.ts:<br/>backend GET /agent/cost-rollup"]
```

**Orchestrator card.** The model-tier preset and the hard monthly USD budget
(blank = no cap), with month-to-date spend (progress bar, green/amber/red tone).

- **Read tiers** (`src/lib/agent/settings-data.ts`): backend
  `GET /agent/settings` → a direct `agent_settings` SELECT + `agent.turn` spend
  sum → mock defaults. The page never throws when the backend is unset.
- **Write path** (`saveAgentSettingsAction` in
  `src/app/(app)/agents/actions.ts`): guarded by
  `requireCapability("settings:write")` (admin-only, ADR-0045), calling the
  backend `PUT` with the acting user's `app_user.id` for the audit trail. There
  is **no DB fallback write, by design** — settings change in one place.

The **preset catalog** (`src/lib/agent/settings.ts`, mirroring the backend's
`PRESET_MODELS`; the live GET carries the authoritative map):

| Preset | Cheap tier | Premium tier | Tagline |
|---|---|---|---|
| **Economy** | Haiku | Haiku | Everything on Haiku — cheapest possible operation. |
| **Balanced** *(default)* | Haiku | Sonnet | Haiku for routing and sub-agents, Sonnet for synthesis. |
| **Premium** | Sonnet | Opus | Sonnet for routing and sub-agents, Opus for synthesis. |

> The exact model ids live in `PRESET_MODELS` and the live backend response — the
> doc names the families (Haiku / Sonnet / Opus) so it never drifts on a point
> release.

**Cost-telemetry rollups.** Spend per metered process and per entity (per board
session, per conversation), via the backend `GET /agent/cost-rollup?month=YYYY-MM`
through the `#190` call-guard seam. No DB fallback (the rollup SQL lives in one
place); degrades to a notice when the backend isn't configured. `?month=` browses
past months.

**Recent agent activity.** The last 20 `agent.turn` audit rows: time, actor,
routed-to, routing reason, model turns, cost.

The Settings **AI tab** reuses the same Orchestrator card + backend PUT.

---

## 5. The in-app agent panel & AI-assisted surfaces

The orchestrator is not only on `/agents` — it is woven into the app.

- **The right-hand agent panel.** The collapsible third column of the app shell
  is the orchestrator chat. One turn = `askAgentAction(message, conversationId)`
  (`src/lib/agent/ask-action.ts`): it resolves the signed-in employee to their
  `app_user.id` via the shared resolver (so the **backend enforces the acting
  user's scope on every tool call**, `#190`), forwards through the call-guard
  seam, and renders the response. When the agent drafts an approval-gated action,
  the result carries `requiresApproval` and the panel shows a notice rather than
  sending. It **degrades to a clear message** when `AGENT_SERVICE_URL` isn't
  configured and **never throws to the client.**
- **Agent-prefilled discovery.** Discovery answers can be agent-pre-filled, and a
  **human confirms** before they count (the assessment-led motion; overview §2).
- **AI summaries across modules** — gold-layer-grounded summaries surface
  throughout the app.

These surfaces all share the same guarantees: acting-user scope, approval-gated
sends, graceful degradation, and audited cost.

---

## 6. Failure handling & degradation

The agent surfaces are built **stubbed-not-broken**:

| Condition | Behavior |
|---|---|
| Backend (`AGENT_SERVICE_URL`) unset | Panel + settings degrade to a notice; reads fall back DB → mock; the page renders. |
| DB unset | Settings fall back to mock defaults; activity lists render sample data. |
| Acting user can't be resolved | A clear "sign in again" / "provision your account" notice, never a crash. |
| Budget ceiling reached | New spend is refused **before** any provider call (a paused state), never a silent overrun. |
| Model unavailable | A persisted failed run, never a crash. |

---

## 7. Where to go next

- The **autonomy controls** that gate every action: [autonomy-dial.md](autonomy-dial.md).
- The **full agent roster** (every tier, not just the two registered sub-agents):
  [orchestration-matrix.md](orchestration-matrix.md).
- The **knowledge** the agents reason over: [knowledge-and-rag.md](knowledge-and-rag.md).
- The **business-process workflows** the orchestrator drives: [icm.md](icm.md).
