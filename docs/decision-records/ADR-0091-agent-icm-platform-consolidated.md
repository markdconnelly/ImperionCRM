---
adr: 0091
title: "Agent & ICM platform — consolidated dossier"
status: accepted
date: 2026-06-16
repo: frontend
summary: "Consolidated dossier of the agent/ICM platform decisions: single orchestrator, persisted agent core + AI Board, own-orchestrator runtime, AI Agents page, autonomy tiers, ICM framework, the orchestration matrix, and the self-hosted Managed Agents runtime + budget-file convention. Carries every member decision verbatim with a zero-loss traceability table; member ADRs are retained."
tags: [agent-icm]
consolidates: [ADR-0004, ADR-0015, ADR-0029, ADR-0048, ADR-0049, ADR-0054, ADR-0055, ADR-0061, ADR-0087, ADR-0088, ADR-0089]
---
# ADR-0091: Agent & ICM platform — consolidated dossier

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Consolidates** | ADR-0004 · ADR-0015 · ADR-0029 · ADR-0048 · ADR-0049 · ADR-0054 · ADR-0055 · ADR-0061 · ADR-0087 · ADR-0088 · ADR-0089 (all retained on disk, `status: consolidated`) |
| **Cross-references** | ADR-0090 (consolidation method, dossier + traceability + retained originals) · ADR-0084 (claim ADR numbers at merge) · ADR-0016 (RBAC / acting-user scope) · ADR-0030 / ADR-0045 (capability gates) · ADR-0050 (AI pages admin-only; amends ADR-0048) · ADR-0041 / ADR-0043 (settled AI stack + pinned vector contract) · ADR-0042 (four-repo division of labor) · ADR-0058 (approval-gated send) · ADR-0060 (skills canon) · ADR-0086 (OKF semantic layer) · backend ADR-0036 (orchestrator runtime — superseded for the loop by ADR-0088) · backend ADR-0035 (identity-gated backend) · backend ADR-0037 (agent settings) · backend ADR-0039 (board runtime) |

## Purpose & scope

This is the **first consolidation dossier produced under [ADR-0090](./ADR-0090-adr-ingestion-overhaul.md)**. It folds the **Agent/ICM cluster** — every decision record that defines how Imperion's agent layer is shaped, persisted, governed, and run — into one ingestible record so that "the current decision about the agent platform" can be reconstructed from a single file rather than a dozen amendment chains.

**Zero loss is the binding constraint (ADR-0090).** A decision is "lost" only if it appears in *no* active record. This dossier therefore:

- **Synthesizes** the current agent/ICM platform decision (the section immediately below);
- **Carries every member decision and every amendment clause VERBATIM** (the per-member sections that follow — quoted directly from each source ADR's *Decision* / governing clauses);
- **Proves zero loss with a traceability table** mapping each source ADR's decision(s) to its dossier section;
- **Retains every member file on disk** with `status: consolidated` + `consolidated_into: ADR-0091` and an inbound pointer — so history and inbound links survive (ADR-0090).

**Boundaries preserved (system CLAUDE.md §1, single-owner rule).** Cross-repo supersessions remain **references, never absorptions**: ADR-0088 supersedes **backend ADR-0036** *for the agent loop*, and that backend ADR is cited, not copied here. Sibling-repo decisions (backend ADR-0035/0036/0037/0039, etc.) are referenced by repo-qualified id only. Each member's existing **status is preserved verbatim** (all eleven members are `Accepted`).

---

## Synthesis — the current agent/ICM platform decision

The agent layer is **one user-facing orchestrator over many internal sub-agents**, persisted, audited, governed by a tiered autonomy policy, and now executed on **self-hosted Managed Agents** driving **ICM-defined business-process workspaces**. In current form:

1. **One orchestrator, never user-facing sub-agents (ADR-0004).** Users talk to a single orchestrator that routes requests, selects tools, invokes sub-agents, manages context/memory, enforces Entra-scoped permissions, and returns responses. This is the single choke point for permission enforcement and audit.

2. **The agent core is persisted in Postgres (ADR-0015), materialized by migration 0056 (ADR-0049).** `agent`, `agent_tool_grant`, append-only `agent_run` + `agent_message` (tokens, `cost_usd`, `acting_user_id`, `permission_scope`), and `agent_memory` (pgvector). **Agent actions inherit the acting user's permission scope** (ADR-0016). `agent.model_routing` is a **tier hint** (`cheap`/`premium`) resolved through the `agent_settings` preset at runtime (ADR-0049); `agent_memory.embedding` is `vector(1024)` under the pinned vector contract (ADR-0041).

3. **The orchestrator is our own code over direct provider APIs — no Foundry Agent Service, no n8n (ADR-0029)** — *for the in-house loop as originally built*. As of ADR-0088 the agent loop itself moves to **self-hosted Managed Agents** (Anthropic runs the loop; the sandbox runs on our infra), which **supersedes backend ADR-0036 for the loop**. The "no managed-orchestration-platform that exfiltrates data / no low-code engine for core logic" principle is *unchanged* — self-hosted CMA keeps all client PII, Key Vault custody, and the send gate on our infra.

4. **The AI Agents page is the operator surface (ADR-0048),** reading/writing the backend's `/agent/settings` (preset · monthly budget ceiling · month-to-date spend) and surfacing `agent.turn` audit activity, with tiered backend→DB→mock fallback. The page (and the Board) are **admin-only** and convening is gated `agents:operate` (ADR-0050, which amends ADR-0048).

5. **The AI Board of Directors is the same agent core with `module='board'` (ADR-0015), its runtime + persistence materialized by migration 0056 (ADR-0049), and its governance defined by ADR-0054:** influence **personas, never impersonations**; an anchor-plus-lenses profile per seat; a persisted board packet grounding deliberation; the **human CISO holds the seat with an AI deputy drafting for him** (ADR-0054 §4, self-amended to the deputy model); synthesis-as-facilitator plus convene-time advisors (cap 5→7).

6. **Autonomy is earned by track record, expressed as data (ADR-0055):** a four-tier policy (T0 read → T1 reversible writes → T2 client-visible propose-only → T3 human-only) enforced mechanically through `agent_tool_grant`. ADR-0087 unifies this into **one dial stored in `autopilot_policies`** (L0 Observe → L1 Draft → L2 Act-gated → L3 Auto → 🔒 Mark-gate) across both the ICM product plane and the coding plane.

7. **Business processes are ICM workspaces — the factory lives in git, the product lives in the platform (ADR-0061).** Workspaces are versioned under `icm/`; the backend executes them stage-by-stage; checkpoints are the approval queue; the **autonomy dial** ramps `draft → auto` per workflow, admin-only and reversible.

8. **The agent system has one map (ADR-0087):** a five-tier taxonomy (Triage · Dispatch · Execute · Observe/Govern · Spine) documented in `docs/agents/orchestration-matrix.md`, with autonomy-as-data, `agent_run` as the one run ledger, and OKF concept files (ADR-0086) as the per-agent context "rooms."

9. **The ICM runtime is self-hosted Managed Agents over a domain-tiered context tree (ADR-0088):** `icm/domains/<domain>/` groups workflows by bounded context; a declarative **`agent.yaml`** per workspace is the CMA agent object; workers are ephemeral and run-scoped; tools execute in our self-hosted sandbox via an `EnvironmentWorker`. This **amends ADR-0061** and **supersedes backend ADR-0036 for the loop**.

10. **Least-privilege is structural, ratified as budget files (ADR-0089):** `icm/CONSTITUTION.yaml` (outer allow-list) and `icm/domains/<d>/room.yaml` (domain budget) enforce `workflow ⊆ domain ⊆ Constitution` for `tools`/`okf_rooms`, with an "absent budget ⇒ next-lower declared list" degradation rule. This **extends ADR-0088 §3**.

### Amendment & supersession web (preserved verbatim)

- **ADR-0050 amends ADR-0048** — the AI Agents page is now **admin-only** (not "visible to all roles"), and the board convene capability moves to `agents:operate` (ADR-0050 also amends backend ADR-0037's Settings tab list and supersedes the `sales:write` convene gate chosen with ADR-0049). *ADR-0050 itself is tagged `authz`, is not a cluster member, and is referenced — not absorbed — here.*
- **ADR-0054 §4 self-amended** the same day (2026-06-10, issue #123) from the original "review-after" model to the **deputy model** (`seat_kind='deputy'`, the CISO Staff Analyst drafting for the human CISO).
- **ADR-0088 amends ADR-0061** (adds the domain tier + declarative manifest + Constitution) **and supersedes backend ADR-0036 for the loop** (Anthropic runs the loop; the backend becomes worker host + loader + ledger mirror). The backend ADR is a **cross-repo reference only** — not absorbed (§1).
- **ADR-0089 extends ADR-0088 §3** — ratifies the budget-file convention (name/location/shape/degradation) that the §3 subset invariant is checked against.
- **ADR-0087 is the orchestration matrix** — the single agent-system map that the other decisions plug into.

All member statuses are **Accepted** and are preserved unchanged; consolidation does not alter any decision's status.

---

## Traceability table (zero-loss proof)

Every cluster member (the 10 named in #757, plus ADR-0029 — included; see "Inclusion of ADR-0029" below), each source decision, and the dossier section that carries it verbatim. The retained member file is the second proof of non-loss.

| Source ADR | Status | Decision(s) carried | Dossier section |
|---|---|---|---|
| **ADR-0004** | Accepted | Single orchestrator; sub-agents never user-facing; orchestrator routes/selects tools/invokes sub-agents/manages memory/enforces Entra-scoped permissions | Synthesis §1 · [M1 — ADR-0004](#m1--adr-0004-single-orchestrator-agent-model) |
| **ADR-0015** | Accepted | Persist the full agent core (`agent`, `agent_tool_grant`, `agent_run`+`agent_message`, `agent_memory`); actions inherit acting-user scope; AI Board = same core, `module='board'`, walled off from CRM writes | Synthesis §2, §5 · [M2 — ADR-0015](#m2--adr-0015-agent-platform-persistence-and-the-ai-board-of-directors) |
| **ADR-0029** | Accepted | Own orchestrator over direct provider APIs; reject Foundry Agent Service and n8n for v1; agent memory/embeddings stay in pgvector | Synthesis §3 · [M3 — ADR-0029](#m3--adr-0029-agent-layer--own-orchestrator-over-direct-provider-apis) |
| **ADR-0048** | Accepted (amended by ADR-0050) | AI Agents page: read via backend GET + DB fallback, write only via backend PUT; preset/budget/spend card; `agent.turn` activity; tiered fallback | Synthesis §4 · [M4 — ADR-0048](#m4--adr-0048-ai-agents-operations-page-orchestrator-settings--activity) |
| **ADR-0049** | Accepted | Migration 0056 materializes the agent core + Board; `model_routing` = tier hint; `agent_memory` vector(1024); board_message nullable agent; one recommendation per session; five seeded personas; orchestrator audit stays in `audit_log` | Synthesis §2, §5 · [M5 — ADR-0049](#m5--adr-0049-materialize-the-agent-core--ai-board-persistence-migration-0056) |
| **ADR-0054** | Accepted (§4 self-amended to deputy model) | Influence personas not impersonations; anchor+lenses per seat; board packet grounding; human-CISO-seat + AI deputy; synthesis-as-facilitator + advisors; cap 5→7; schema impact | Synthesis §5 · [M6 — ADR-0054](#m6--adr-0054-board-of-directors--influence-personas-packet-grounding-facilitator-advisors-and-recommendation-review) |
| **ADR-0055** | Accepted | Four-tier autonomy policy (T0–T3); mechanical enforcement via `agent_tool_grant`; T2 propose-only, per-step whitelist from v3 on track record; T3 human-only | Synthesis §6 · [M7 — ADR-0055](#m7--adr-0055-tiered-agent-autonomy-policy--automation-earned-by-track-record) |
| **ADR-0061** | Accepted | ICM framework: factory in git (`icm/`), product in the platform; backend executes stage-by-stage; checkpoints = approval queue; per-workflow `draft → auto` autonomy dial; rollout order | Synthesis §7 · [M8 — ADR-0061](#m8--adr-0061-interpreted-context-methodology-as-the-business-process-automation-framework) |
| **ADR-0087** | Accepted | Five-tier agent taxonomy (Triage/Dispatch/Execute/Observe-Govern/Spine); autonomy = one dial in `autopilot_policies`; `agent_run` = the run ledger; OKF concept files = per-agent rooms | Synthesis §6, §8 · [M9 — ADR-0087](#m9--adr-0087-agent-orchestration--observability-layer) |
| **ADR-0088** | Accepted | Self-hosted Managed Agents runtime; domain tier `icm/domains/<d>/`; declarative `agent.yaml` manifest; ephemeral run-scoped workers; self-hosted sandbox; amends ADR-0061, supersedes backend ADR-0036 for the loop | Synthesis §3, §9 · [M10 — ADR-0088](#m10--adr-0088-icm-agent-runtime-on-self-hosted-managed-agents--domain-tiered-context) |
| **ADR-0089** | Accepted | ICM budget files `CONSTITUTION.yaml` + `domains/<d>/room.yaml`; `{tools, okf_rooms}` shape; absent-budget degradation rule; schema-vs-invariant split; extends ADR-0088 §3 | Synthesis §10 · [M11 — ADR-0089](#m11--adr-0089-icm-least-privilege-budget-files-constitutionyaml--domainsdroomyaml) |

**Member count: 11** (10 from #757 + ADR-0029). Cross-repo references preserved as references (not absorbed): backend ADR-0035, backend ADR-0036 (superseded-for-the-loop), backend ADR-0037, backend ADR-0039. In-repo amendment reference preserved (not absorbed): ADR-0050 (`authz`).

### Inclusion of ADR-0029

**ADR-0029 IS included** as a cluster member. The #757 brief named 10 members but flagged the relocated ADR-0029 for a judgment call ("err toward inclusion to preserve zero loss"). ADR-0029 is unambiguously an agent/ICM decision — it is tagged `tags: [agent-icm]`, is the `repo: frontend` record that *settles how the agent layer runs* (own orchestrator over direct provider APIs; reject Foundry Agent Service and n8n; keep memory/embeddings in pgvector), and is the direct antecedent of ADR-0088's runtime decision (ADR-0088 "supersedes backend ADR-0036 *for the loop*"; ADR-0029 is the in-repo statement of the own-orchestrator principle that decision evolves). Excluding it would leave a load-bearing agent-runtime decision outside the dossier, which is exactly the loss ADR-0090 forbids. It is therefore carried verbatim (§M3) and consolidated.

---

# Member decisions (verbatim)

Each section below reproduces the governing decision text of one member ADR **verbatim** from its source file. The full source ADR (Problem / Context / Options / Consequences / Future considerations) is retained on disk under its original filename; only its decision and binding clauses are quoted here, which is what the zero-loss guarantee requires.

## M1 — ADR-0004 (Single-orchestrator agent model)

> Source: [`ADR-0004-single-orchestrator-agent-model.md`](./ADR-0004-single-orchestrator-agent-model.md) · Status: **Accepted** (2026-06-06)

**Decision (verbatim):**

> Users interact with one orchestrator. Sub-agents never interact with users directly. The orchestrator routes requests, selects tools, invokes sub-agents, manages context and memory, enforces Entra-scoped permissions, and returns responses.

Security impact (verbatim): "Single choke point for permission enforcement and audit; sub-agent tool access is gated centrally."

## M2 — ADR-0015 (Agent platform persistence and the AI Board of Directors)

> Source: [`ADR-0015-agent-platform-and-board.md`](./ADR-0015-agent-platform-and-board.md) · Status: **Accepted** (2026-06-07)

**Decision (verbatim):**

> Persist the **full agent core**: `agent` (instructions, `model_routing`, tool scope, `module` tag), `agent_tool_grant`, append-only `agent_run` + `agent_message` (tokens, `cost_usd`, `acting_user_id`, `permission_scope`), and `agent_memory` (pgvector). **Agent actions inherit the acting user's permission scope** (ADR-0016). The **AI Board of Directors** is the same core with `module='board'`: persona agents (`persona_role`) usable 1:1 or via a convened **`board_session`** where selected members deliberate (`board_message`) and the session yields a `board_recommendation`. The Board reads only granted business context and is walled off from CRM operational writes. Provider-agnostic model routing is config in `agent.model_routing`, not a hard dependency.

## M3 — ADR-0029 (Agent layer — own orchestrator over direct provider APIs)

> Source: [`ADR-0029-agent-layer-runtime.md`](./ADR-0029-agent-layer-runtime.md) · Status: **Accepted** (2026-06-07) · Repo line (verbatim): "ImperionCRM_Backend (orchestrator + sub-agents run here, per ADR-0018 / ADR-0028)"

**Decision (verbatim):**

> Build the agent layer as **our own orchestrator calling provider APIs directly** through the model-routing layer (Option 2). Do **not** adopt Foundry Agent Service or n8n for v1. Keep agent memory and embeddings in pgvector.
>
> Revisit Foundry hosted agents only via a future ADR if and when multi-agent load, scaling, or observability needs outgrow our own runtime — with a measured cost comparison, not as a default.

**Note (consolidation):** ADR-0088 later moves the *loop* to self-hosted Managed Agents (Anthropic runs the loop, our sandbox), superseding **backend ADR-0036** for the loop. The own-data-residency / no-low-code-engine principle ADR-0029 states is preserved; the build-it-ourselves-from-scratch loop is what ADR-0088 changes.

## M4 — ADR-0048 (AI Agents operations page — orchestrator settings + activity)

> Source: [`ADR-0048-ai-agents-operations-page.md`](./ADR-0048-ai-agents-operations-page.md) · Status (verbatim): **"Accepted (amended by ADR-0050 — the page is now admin-only, not visible to all roles)"** (2026-06-09)

**Decision (verbatim):**

> - **Service client** — `agentService.getSettings()` / `updateSettings()` on the existing agent descriptor (`/agent/settings`, MI bearer via Easy Auth, ADR-0028/0035).
> - **Read tiers** — `src/lib/agent/settings-data.ts`: backend GET → direct SELECT on `agent_settings` + `agent.turn` spend sum → mock defaults.
> - **Write path** — `saveAgentSettingsAction` (in `src/app/(app)/agents/actions.ts`) guarded by `requireCapability("settings:write")` (admin-only, ADR-0045), calling the backend PUT with the acting user's `app_user.id` for the audit trail. No DB fallback write, by design.
> - **Page** — `/agents`: Orchestrator card (preset selector with the pinned model pair per tier, budget input where blank = no cap, month-to-date spend with progress + green/amber/red tone), Registered sub-agents card (reporting · sales · search_knowledge, with the approval-gate and read-only badges), Recent agent activity (last 20 `agent.turn` audit rows: time, actor, routedTo, routing reason, model turns, cost).
> - **Pure logic** — preset catalog mirror, budget parsing/progress/formatting in `src/lib/agent/settings.ts`, unit-tested (`settings.test.ts`).
> - Non-admins see the Orchestrator card read-only; the page itself stays visible to all roles (reads are broadly available, ADR-0030/0045).

**Amendment (preserved verbatim, ADR-0050):** the last bullet is superseded — the AI Agents page is now **admin-only** (`canSeeAgentPages`), not "visible to all roles." See the amendment web above; ADR-0050 is referenced, not absorbed.

## M5 — ADR-0049 (Materialize the agent core + AI Board persistence, migration 0056)

> Source: [`ADR-0049-board-runtime-persistence.md`](./ADR-0049-board-runtime-persistence.md) · Status: **Accepted** (2026-06-09)

**Decision (verbatim):**

> Migration `0056_agent_core_and_board.sql` creates the Diagram-3 core with those updates folded in:
>
> 1. **`agent.model_routing` is a tier hint** (`{"tier":"cheap"|"premium"}`); the concrete models resolve through the `agent_settings` preset at runtime.
> 2. **`agent_memory.embedding` is `vector(1024)`** under the same pinned contract and provenance columns as `knowledge_embedding`, HNSW cosine index.
> 3. **`board_message.agent_id` is nullable** — a NULL row is the orchestrator / synthesis voice in the transcript.
> 4. **One recommendation per session** (`board_recommendation.session_id UNIQUE`).
> 5. **Five starter personas seeded** (CEO, CFO, COO, CMO, CISO; `module='board'`, premium tier) — editable in-app later; insert-once via `ON CONFLICT DO NOTHING`.
> 6. **Orchestrator audit stays in `audit_log` for now.** Moving the CRM orchestrator's per-turn audit into `agent_run`/`agent_message` is a separate, later change; the Board runtime writes `agent_run` rows from day one.

**Amendment (preserved verbatim):** the convene capability chosen with ADR-0049 (`sales:write`) is **superseded by ADR-0050** (convening now requires `agents:operate`); ADR-0050: "ADR-0049's runtime and persistence decisions are untouched — only the convene capability moves."

## M6 — ADR-0054 (Board of Directors — influence personas, packet grounding, facilitator, advisors, recommendation review)

> Source: [`ADR-0054-board-influence-personas-and-governance.md`](./ADR-0054-board-influence-personas-and-governance.md) · Status (verbatim): **"Accepted (2026-06-10, decisions locked with Mark in the board-vision grilling session, issue #118; §4 amended to the deputy model the same day, issue #123)"**

**Decision (verbatim):**

> 1. **Personas are influence profiles, never impersonations.** Seats keep functional names (Chief Executive, Chief Financial Officer, …). Each persona's `agent.instructions` cites the named thinkers' *published frameworks* (books, shareholder letters, talks) as reasoning lenses; the agent never claims to be the person, never speaks first-person as them, and the UI never presents a real person's name as a board member. (Rejected: full impersonation and named-but-disclaimed personas — right-of-publicity exposure for living, actively-litigious people, in a **public repo**, and a landmine if the product is ever shown to a client or productized for other MSPs.)
>
> 2. **Anchor + lenses per seat.** One persona per officer seat, written around a dominant anchor framework plus named secondary lenses invoked when relevant:
>    - **CEO** — anchor: Herjavec (built/sold an MSSP — the only influence who ran this business model at scale); lenses: Bezos (Day-1, written-narrative discipline, customer obsession), Nadella (partner-ecosystem strategy, growth mindset), Sinek (Start With Why / Infinite Game), Willink (Extreme Ownership).
>    - **CFO** — anchor: Crabtree (*Simple Numbers*: labor-efficiency ratio, salary-cap thinking for service businesses); lenses: Ramsey (debt aversion, cash reserves), Dalio (macro/risk machine — "what happens to MSP demand in a downturn?").
>    - **COO** — anchor: Leila Hormozi (people systems, hiring/firing, scaling ops culture); lenses: Lencioni (Five Dysfunctions / organizational health), Covey (7 Habits + 4 Disciplines of Execution).
>    - **CMO** — anchor: Alex Hormozi (offers, $100M Leads — feeds the demand-gen engine); lenses: Vaynerchuk (attention arbitrage, content volume), Carnegie (relationship-led sales for an MSP motion).
>    - **CISO** — the seat belongs to the human owner (see decision 4); an AI **CISO Staff Analyst** deputy drafts the security position, grounded in the security-posture gold data; threat-model-of-an-MSP-under-continuous-attack character retained.
>    (Rejected: even blends — voices average into generic advice; rival personas per seat — blows the seat cap and triples cost.)
>
> 3. **Board packet grounds deliberation.** Before round 1, one cheap-tier composition pass assembles a topic-relevant written packet — reporting aggregations, semantic-search pulls from the gold knowledge layer, security-posture summary, pipeline/campaign numbers — and every persona deliberates over the *same* packet (written-narrative discipline). The packet is persisted with the session for audit: the record shows what the board knew when it recommended. (Rejected: live tools per persona — ~5× cost and unpredictable latency; snapshot-only status quo — ungrounded "vibes" deliberation.)
>
> 4. **The human CISO holds the seat; an AI deputy drafts for him** *(amended 2026-06-10, issue #123 — supersedes the original review-after model)*. The board's security voice is the **CISO Staff Analyst**, a deputy persona (`seat_kind='deputy'`) that deliberates in rounds 1–2 like any member but is labeled as drafting *for* the human CISO. Mark is the CISO of record: synthesis is instructed that the human CISO's stated position carries **veto weight on security matters** and supersedes the deputy's draft wherever they conflict. Mechanically staged: **v1** — a convene-time CISO-position field (`board_session.ciso_position_md`, optional; when empty the deputy's draft stands, explicitly labeled as unreviewed staff analysis); **v2** — the full deputy flow: sessions become resumable and pause after round 2 (`awaiting_ciso`) for Mark to approve, amend, or overrule the deputy's draft before synthesis runs. The post-session **ratify/overrule review** on `board_recommendation` is retained as the accountability record on the final recommendation — voice before synthesis, verdict after it. (Rejected: review-after only — auditor authority, not seat authority; pure human seat — loses the posture-grounded draft when he isn't available.)
>
> 5. **Synthesis becomes the facilitator; advisors are convene-time invitees.** The hidden synthesis agent takes a Lencioni-influenced facilitation character: surface disagreements honestly (healthy conflict), never paper over a split board. Three advisory personas — Negotiation (Voss: tactical empathy, calibrated questions), Performance (Robbins: state/psychology), People & Responsibility (Peterson) — can be invited per session when the topic warrants; the seated cap rises 5 → 7; advisors speak in deliberation but are labeled advisory and weighed as counsel, not votes. One-on-one advisor consults are **orchestrator** sub-agents (v2), not board features.

**Schema impact (verbatim):**

> - `board_recommendation`: `review_status text NOT NULL DEFAULT 'pending_review'` (`pending_review | ratified | overruled`), `reviewed_by` (app_user ref), `reviewed_at timestamptz`, `review_rationale text`.
> - `board_session`: `packet_md text` — the persisted board packet; `ciso_position_md text` — the human CISO's position (convene-time in v1; captured at the pause in v2). The v2 `awaiting_ciso` session status ships with the v2 resumable-session migration, not 0059.
> - `agent`: `seat_kind text` check (`officer | advisor | facilitator | deputy`) for `module='board'` rows; data migration rewrites the four officer personas' `instructions` to the influence profiles, converts the CISO row to the CISO Staff Analyst deputy, re-characterizes the synthesis agent as facilitator, and seeds the three advisor personas (`is_active=true`, never convened by default).
> - Backend constant: seated-persona cap 5 → 7 (officers + deputy + ≤2 advisors).

## M7 — ADR-0055 (Tiered agent autonomy policy — automation earned by track record)

> Source: [`ADR-0055-tiered-agent-autonomy-policy.md`](./ADR-0055-tiered-agent-autonomy-policy.md) · Status (verbatim): **"Accepted (2026-06-10, locked with Mark in the board-vision grilling session, issue #118)"**

**Decision (verbatim):**

> A four-tier action policy, applied to every agent capability across all four repos:
>
> | Tier | Scope | Policy |
> |---|---|---|
> | **T0** | Read / analyze / search / summarize | Always autonomous. |
> | **T1** | Internal, reversible writes (draft tasks, enrichment facts, AI-labeled notes, knowledge syncs) | Autonomous + audited, with undo. AI-authored rows are labeled as such. |
> | **T2** | Client-visible actions (email, SMS, proposals, anything a client could see) | Propose-only by default, forever. From v3, an *individual workflow step* may be whitelisted for autonomy only after running in propose mode with a sustained near-100% human-approval streak (threshold recorded on the grant). Whitelisting is per-step, never per-channel. |
> | **T3** | Irreversible / financial / permissions / production-data mutations | Human-only. Agents may recommend; they never hold an executing tool grant. |
>
> **Enforcement is mechanical, not aspirational:** the existing `agent_tool_grant` table (unused since migration 0056) becomes the enforcement point — every tool a sub-agent can invoke carries a tier in its grant `scope`, the backend tool-use loop refuses calls above the grant, and T2 whitelist grants record the approval track record that justified them. ADR accepted in v1; grant enforcement wired by v3.

## M8 — ADR-0061 (Interpreted Context Methodology as the business-process automation framework)

> Source: [`ADR-0061-icm-business-process-automation.md`](./ADR-0061-icm-business-process-automation.md) · Status (verbatim): **"Accepted (2026-06-12, Mark's grilling answers)"**

**Decision (verbatim):**

> **The factory lives in git; the product lives in the platform.**
>
> - **Definitions (factory):** ICM workspaces are versioned in THIS repo under `icm/` — one folder per business workflow, numbered stage folders, each stage a `CONTEXT.md` contract (Inputs/Process/Outputs/Audit), plus runtime skill bundles (ICP, voice, offer catalog, channel rules). Changing a workflow is a normal issue → micro-PR. Conventions: [icm/CONVENTIONS.md](../../icm/CONVENTIONS.md).
> - **Execution (product):** the backend orchestrator (backend ADR-0036) runs a workflow as a sequence of single-job agent turns, loading ONLY that stage's contract + referenced context per turn (ICM layered loading; settled AI stack ADR-0043 — Haiku for mechanical stages, Sonnet for drafting/judgment). Stage artifacts persist as run records in Postgres (schema proposed here, separate PR), not as files — every artifact remains human-readable and editable between stages via the GUI.
> - **Checkpoints = the approval queue.** A checkpoint stage emits an approval item in the app; the run parks until a human approves/edits/rejects. Outbound sends always exit through the ADR-0058 approval-gated send path.
> - **The autonomy dial (the trust ramp):** every workflow carries `autonomy_mode` — `draft` (every checkpoint requires a human) → `auto` (checkpoints self-approve within the workflow's skill set; exceptions still park). All workflows START in `draft`. Flipping to `auto` is per-workflow, admin-only in the GUI, audited, and reversible. A `tiered` mode (auto for low-risk actions, approval for substantive ones) is anticipated but needs its own ADR defining tier boundaries before it exists.
> - **Rollout order (Mark, 2026-06-12):** marketing/sales first (lead response + nurture: Meta lead forms→email, website forms→email, FB/IG DM in-channel replies, Apollo outbound — sender identity = a shared sales mailbox), then project management, then service desk (e.g. backup-failure monitor agent — the canonical draft→auto example).

**Amendment (preserved verbatim, ADR-0088):** "This **amends ADR-0061** (adds the domain tier + declarative manifest + Constitution) and **supersedes backend ADR-0036 for the loop**." The backend ADR-0036 reference in ADR-0061's Execution bullet is therefore superseded-for-the-loop by ADR-0088 (cross-repo reference, not absorbed).

## M9 — ADR-0087 (Agent orchestration & observability layer)

> Source: [`ADR-0087-agent-orchestration-and-observability-layer.md`](./ADR-0087-agent-orchestration-and-observability-layer.md) · Status: **Accepted** (2026-06-15)

**Decision (verbatim):**

> Adopt a **five-tier agent taxonomy** documented in [`docs/agents/orchestration-matrix.md`](../agents/orchestration-matrix.md):
>
> 1. **Triage** — one role parameterized by domain (service-ticket · project-task · lead · coding-issue); stamps each incoming unit with archetype · owner · autonomy rung · gate flag.
> 2. **Dispatch** — Router · Scheduler · Concurrency-governor. **Code primitives, not personas.**
> 3. **Execute** — the ICM executors and coding builders (the existing roster).
> 4. **Observe / Govern** *(new)* — Run-ledger · Health/SLA monitor · Platform/SRE health · Drift detector · Reconciler · Controller (reconciliation-assurance) · Gatekeeper · Policy/guardrail.
> 5. **Spine** — Canon steward (keeps OKF / skills / ADR / handoff registries fresh).
>
> Three load-bearing rules:
>
> - **Autonomy is one dial, stored as data.** Every tier reads its rung (L0 Observe → L1 Draft → L2 Act-gated → L3 Auto → 🔒 Mark-gate) from `autopilot_policies`. Gating an action or ramping it after testing is a **data change, not a code change** — unifying the ICM draft→auto ramp (ADR-0061) with the coding-plane standing-OKs (system CLAUDE.md §10.4).
> - **The run ledger is `agent_run`** (one format, both planes) — no new store.
> - **OKF concept files are the per-agent context "rooms"** (ADR-0086), consumed at the **section** level: triagers read *definitions*, reconcilers read *authority + joins*, the guardrail reads *PII-notes*, drift reads *schema*. This lets the guardrail/drift/reconciler wire generically across all entities.

## M10 — ADR-0088 (ICM agent runtime on self-hosted Managed Agents + domain-tiered context)

> Source: [`ADR-0088-icm-self-hosted-managed-agents-runtime.md`](./ADR-0088-icm-self-hosted-managed-agents-runtime.md) · Status: **Accepted** (2026-06-16)

**Decision (verbatim):**

> Adopt **self-hosted Managed Agents** as the ICM product-runtime executor, and restructure the `icm/` tree around a **layered context hierarchy**.
>
> 1. **Domain tier.** `icm/domains/<domain>/` groups workflows by bounded context (nine verticals: Marketing, Sales, Delivery & Projects, Service Desk, Customer Success, Finance, People, Knowledge, Security Ops). Each carries a thin `room.md` (domain prose) and domain-shared `skills/`. Horizontals — Governance/Policy, Identity/Access, Observability, Data Platform, Engineering — are **inherited from a top-level `CONSTITUTION.md`, never peer folders**. Shared kernel entities: `account`, `contact`, `employee`, `contract`.
>
> 2. **Declarative `agent.yaml` per workspace** = the CMA agent object. The backend loader composes `system` from `CONSTITUTION.md` + the domain `room.md` + the workflow prose (stable → cached prefix); `model`/`tools`/`skills`/`mcp_servers`/`autonomy_rung`/`okf_rooms` are structured fields where least-privilege is enforced. A workflow's `tools`/`okf_rooms` must be a subset of its domain's. The prose file is **not** named `CLAUDE.md` (that name auto-loads in the Claude Code dev tool during dry-runs); the loader reads by explicit path.
>
> 3. **Ephemeral, run-scoped workers.** A trigger → deterministic triage/dispatch (code, ADR-0087) → a session provisioned from the workspace `agent.yaml`. No long-lived per-domain agent; the agent object is created once and versioned, the session is the per-run spin-up.
>
> 4. **Self-hosted sandbox.** Tools execute in our infra via an `EnvironmentWorker` (`config:{type:"self_hosted"}`). Sends exit only through ADR-0058; secrets stay host-side (Key Vault; vaults only for MCP OAuth). CMA session events are mirrored into `agent_run`/`agent_message` so our Postgres ledger stays the audit canon.
>
> This **amends ADR-0061** (adds the domain tier + declarative manifest + Constitution) and **supersedes backend ADR-0036 for the loop** (Anthropic runs it; the backend becomes the worker host + loader + ledger mirror). It makes ADR-0087's "rooms" physical files.

**Cross-repo note (preserved):** "backend ADR-0036 (orchestrator runtime, superseded for the loop)" — backend ADR-0036 is a sibling-repo decision and is **referenced, not absorbed** (system CLAUDE.md §1).

## M11 — ADR-0089 (ICM least-privilege budget files: CONSTITUTION.yaml + domains/<d>/room.yaml)

> Source: [`ADR-0089-icm-budget-file-convention.md`](./ADR-0089-icm-budget-file-convention.md) · Status: **Accepted** (2026-06-16)

**Decision (verbatim):**

> Ratify the ICM budget-file convention as a settled decision. It has four parts.
>
> ### 1. File naming + location
>
> | File | Location | Tier | Companion prose |
> |---|---|---|---|
> | `CONSTITUTION.yaml` | `icm/CONSTITUTION.yaml` | outer (Constitution) | `icm/CONSTITUTION.md` |
> | `room.yaml` | `icm/domains/<domain>/room.yaml` | domain | `icm/domains/<domain>/room.md` |
>
> Names and locations are fixed. There is exactly one `CONSTITUTION.yaml` (the single place a new capability enters the agent layer) and one `room.yaml` per domain, sitting beside that tier's `.md` prose. The per-workflow allow-list is **not** a separate budget file — it is the `tools`/`okf_rooms` of the workflow's own `agent.yaml` (ADR-0088, `icm/agent.schema.json`).
>
> ### 2. Shape of the two files
>
> Both files are the same minimal YAML shape — two string allow-lists:
>
> ```yaml
> tools:      [<tool-id>, ...]      # stable tool identifiers the backend loader maps
> okf_rooms:  [<silver-entity>, ...] # each resolves to a docs/database/semantic-layer
>                                    #   coverage-matrix row (ADR-0086)
> ```
>
> - `tools` — the union of capabilities grantable at this tier. Names are stable references the backend loader maps to implementations; never values.
> - `okf_rooms` — the union of silver entities readable at this tier; each name resolves to an OKF coverage-matrix row (ADR-0086).
> - Both are flat string allow-lists (block or flow YAML sequences). No nested structure, no per-entry config, no secrets, no client PII — these files replicate to every agent machine (ADR-0060). Tool and room names are references, never values.
>
> A domain `room.yaml` entry MUST itself appear in `CONSTITUTION.yaml` (the domain narrows, never widens); the gate's `checkSubset` enforces this as defence in depth.
>
> ### 3. Degradation semantics — absent budget ⇒ next-lower declared list
>
> A budget file at any upper tier is **optional**. When a tier's budget is absent, the gate does not fail and does not treat the tier as forbidding everything; instead **that tier's bound is the next-lower declared list**, so an absent allow-list can never be *widened past* (there is nothing above to widen against):
>
> - **Absent `CONSTITUTION.yaml`** ⇒ the domain's `room.yaml` is the authoritative outer bound (the Constitution neither widens nor narrows).
> - **Absent domain `room.yaml`** ⇒ the workflow's own `agent.yaml` list is its own bound — the subset check passes vacuously, but the manifest is still **fully shape-checked** against `icm/agent.schema.json`'s constraints.
>
> This is the gate's documented rule (`resolveDomainBudget` / the `??` fall-throughs in `main()`): `dTools = domain.tools ?? manifest.tools`, `constitutionTools = cTools ?? dTools`. Its purpose is **ship order**: the schema, the gate, and a workflow's `agent.yaml` can land before the domain tier's budget files exist, and every manifest is still structurally validated and is never permitted to widen above a declared tier. Adding a budget file later only ever *tightens*, never loosens — so the degradation is safe-by-construction (an absent budget is the most permissive case, and the explicit budget that replaces it can only remove entries).
>
> ### 4. Structure (schema) vs invariant (gate) — two complementary contracts
>
> - `icm/agent.schema.json` is the **per-manifest STRUCTURE** contract: it validates a *single* `agent.yaml`'s shape (required keys, enums, the `system_compose` order, allow-list arrays, no inline `mcp_servers` secrets). It cannot, by design, express a relationship spanning three files.
> - `scripts/agent-yaml-gate.mjs` enforces the **cross-tier INVARIANT** (`workflow ⊆ domain ⊆ Constitution`) by reading the budget files this ADR ratifies and reimplementing the schema's load-bearing structural checks (so CI needs no JSON-Schema runtime). Its pure functions are the **same** ones the backend loader imports (Backend #162) — one contract, no drift.
>
> So: the schema governs *one file's structure*; the budget files + gate govern *how the three tiers compose*. Both are required; neither subsumes the other. This ADR ratifies the budget files (the second axis); ADR-0088 / `agent.schema.json` own the first.
>
> This ADR **extends ADR-0088 §3**: ADR-0088 ratified the subset *invariant* and the `agent.yaml` manifest; this ADR ratifies the *budget files* the invariant is checked against (their name, location, shape, and absent-tier degradation).

---

## Consequences

### Security impact

No change to any security posture — this is a documentation consolidation (ADR-0090). Every security control of the member ADRs remains in force and is carried verbatim: the single permission choke point (ADR-0004), acting-user-scope inheritance (ADR-0015/0016), admin-only AI pages + `agents:operate` convene gate (ADR-0050 amending ADR-0048/0049), tiered autonomy as a mechanical control (ADR-0055), the gatekeeper/guardrail roles (ADR-0087), self-hosted data residency + Key Vault custody (ADR-0088), and structural least-privilege via budget files (ADR-0089). `Never commit secrets` — no secrets, tokens, or client PII appear in this dossier or any member file.

### Cost impact

None. No runtime, schema, or model change. Slightly larger ADR corpus to index (one added file); the generated index and `adr-index.json` absorb it mechanically.

### Operational impact

The agent/ICM decision surface is now reconstructable from one file. Member files are retained with `status: consolidated` + `consolidated_into: ADR-0091`, so all inbound `ADR-NNNN` links and history survive. The generated README index (`scripts/adr-index.mjs`) and `adr-index.json` are regenerated in the same change; `--check` passes. Future agent/ICM decisions either supersede a member (and update this dossier's web in the same PR) or, if net-new, are authored standalone and folded in at the next consolidation pass.

## Future considerations

- This dossier is vectorized into gold alongside other knowledge once stable (ADR-0090 future considerations; LocalPipeline).
- As later agent/ICM ADRs land (e.g. the anticipated `tiered`-autonomy ADR named in ADR-0061, or the AR/invoice entity that unblocks ADR-0087's Collections/Controller roles, #668), they amend the relevant member and this dossier's synthesis + amendment web in the same PR.
- The same consolidation method (ADR-0090) applies to the next clusters (medallion, crm-core, surfaces, …).
