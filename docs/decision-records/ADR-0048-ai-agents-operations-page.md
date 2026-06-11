# ADR-0048: AI Agents operations page (orchestrator settings + activity)

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted (amended by ADR-0050 — the page is now admin-only, not visible to all roles) |
| **Date** | 2026-06-09 |
| **Cross-references** | backend ADR-0036, backend ADR-0037, backend ADR-0032 |

## Problem

The backend now has a real Claude tool-use orchestrator (backend ADR-0036) and
agent settings endpoints (backend ADR-0037, `agent_settings` migration 0054
applied), but the front end's AI Agents page was still a `<ModulePlaceholder>`.
Operators had no GUI for the model-tier preset, the monthly budget ceiling, or
what the agent layer is actually doing/spending.

## Context

- Backend wire contract: `GET/PUT /api/agent/settings` →
  `{ preset, budgetUsdMonthly, models, spendMonthToDateUsd, presets }` with
  preset ∈ economy | balanced | premium, each pinning a (cheap, premium) Claude
  pair. The budget is a HARD ceiling — at the cap the orchestrator refuses turns.
- There is **no separate agent-run table**: the orchestrator audits every turn
  to `audit_log` with `action='agent.turn'` carrying `detail.routedTo`,
  `detail.routingReason`, loop metadata, and `detail.usage.costUsd`
  (backend ADR-0032 metering). Spend is derived from the same rows.
- Grants: the web identity holds SELECT on `agent_settings` (migration 0054,
  "for rendering") and on `audit_log` (migration 0002 ALL-TABLES grant) — but
  **no UPDATE** on `agent_settings`.
- Division of labor (ADR-0042): direct DB *reads* for rendering are fine; every
  *process* calls the backend.

## Options considered

1. Read through the backend GET with a direct-DB read fallback; write ONLY via
   the backend PUT (this decision).
2. Read/write `agent_settings` directly from the app (rejected — writes are a
   process; the web role deliberately lacks the grant; the backend also caches
   settings and audits changes, which a direct write would bypass).
3. A new `agent_run` table + repository for activity (rejected — the audit
   trail already carries everything the table needs; a second bookkeeping
   table would drift, per backend ADR-0037's same reasoning for spend).
4. Keep the placeholder until the Board page lands too (rejected — settings
   are live in prod with no GUI; the budget control is a cost-safety feature).

### Tradeoffs

- (1) The page is honest in every environment: backend wired → live state +
  editable; backend unset but DB present → persisted truth rendered read-only
  with a clear notice; neither → mock defaults (the app-wide ADR-0007 pattern).
- The sub-agents card is **static-from-contract**: it lists exactly what the
  backend registers today (reporting, sales, plus the `search_knowledge` tool).
  Cost: it must be updated when a sub-agent registers — accepted; presenting a
  live registry would need a new backend endpoint for marginal value now.
- The preset → model-pair catalog is mirrored in `src/lib/agent/settings.ts`
  as a render fallback; the live GET's `presets` map wins when available.

## Decision

- **Service client** — `agentService.getSettings()` / `updateSettings()` on the
  existing agent descriptor (`/agent/settings`, MI bearer via Easy Auth,
  ADR-0028/0035).
- **Read tiers** — `src/lib/agent/settings-data.ts`: backend GET → direct
  SELECT on `agent_settings` + `agent.turn` spend sum → mock defaults.
- **Write path** — `saveAgentSettingsAction` (in `src/app/(app)/agents/actions.ts`)
  guarded by `requireCapability("settings:write")` (admin-only, ADR-0045),
  calling the backend PUT with the acting user's `app_user.id` for the audit
  trail. No DB fallback write, by design.
- **Page** — `/agents`: Orchestrator card (preset selector with the pinned
  model pair per tier, budget input where blank = no cap, month-to-date spend
  with progress + green/amber/red tone), Registered sub-agents card
  (reporting · sales · search_knowledge, with the approval-gate and read-only
  badges), Recent agent activity (last 20 `agent.turn` audit rows: time, actor,
  routedTo, routing reason, model turns, cost).
- **Pure logic** — preset catalog mirror, budget parsing/progress/formatting in
  `src/lib/agent/settings.ts`, unit-tested (`settings.test.ts`).
- Non-admins see the Orchestrator card read-only; the page itself stays visible
  to all roles (reads are broadly available, ADR-0030/0045).

## Consequences

### Security impact

Writes are double-gated: the front-end capability guard (admin-only) plus the
backend's caller-auth (only the web app's MI). The page adds no new DB writes;
activity is a read of the existing audit trail. The budget control itself is a
cost-abuse guard for the agent layer.

### Cost impact

None material — two extra queries per page view in the fallback tier; the
backend GET is one function call. The page makes the cost ceiling operable.

### Operational impact

None to deploy (migration 0054 already applied). When AGENT_SERVICE_URL is
unset the page degrades read-only with an explicit notice. When a new sub-agent
registers in the backend, update the SUB_AGENTS list on the page.

## Future considerations

A live `GET /agent/registry` endpoint to replace the static sub-agents card;
per-run drill-down (the audit `detail.calls` array already carries per-model
metering); monthly spend trend chart; budget alerts ahead of the hard stop;
the Board page (ADR-0015) remains the last placeholder.
