# Jarvis — the landing page & orchestrator front door

[← The AI suite](README.md) · Surface for the single-orchestrator model (CLAUDE.md §2.2,
backend ADR-0036/0080). Schema: FE #1064 (`agent_conversation`, `agent_run.conversation_id`).

**Jarvis is the front door of Imperion OS** (#1118, epic #1038): the default page a user
lands on after authenticating, and the intended driver of work. On this route the
orchestrator is the *whole* screen — there is **no right-hand sidecar** (every other page
keeps it; AppShell suppresses it on `/jarvis`).

## The surface (`/jarvis`)

A codex-style three-pane console (`src/components/agent/jarvis-console.tsx`):

1. **Session history rail** (left) — the signed-in employee's past conversations
   (`agent_conversation`), newest activity first, with a **New conversation** button.
2. **Live chat** (center, the main focus) — the orchestrator turn loop. The composer
   sends through `askAgentAction` (backend ADR-0036) threaded by a per-session
   `conversation_id`; replies render inline. Drafts that need approval show a notice —
   **nothing is ever sent automatically** (ADR-0058).
3. **Drill-in pop-out** (right, on demand) — selecting a past session opens its verbose
   **glass-box trace**: each `agent_run` (agent · status · cost) and its ordered
   `agent_message` stages (role · content · tool calls), so a human can drill into exactly
   what the agent did.

## Data sources

| Surface | Reads | Module |
|---|---|---|
| History rail | `agent_conversation` (scoped to `created_by`) | `src/lib/agent/jarvis.ts` |
| Drill-in trace | `agent_run` → `agent_message` by `conversation_id` | `src/lib/agent/jarvis.ts` |
| Live turn | backend orchestrator via `askAgentAction` | `src/lib/agent/ask-action.ts` |

## Boundaries & degradation

- **Reads only** (ADR-0042): the FE never writes the ledger — the backend persists
  conversations; the FE only sends turns (with a `conversation_id`). So a new session
  appears in the rail after the backend writes it.
- **Graceful tiers** (ADR-0007/0042): DB/backend unset → mock sample; query failure →
  empty, never a page error. Until migration 0163 (#1064) is prod-applied the
  `agent_run.conversation_id` column is absent, so a live DB returns an empty rail —
  the surface is **deploy-dormant, not broken**.
- **Scope** (ADR-0016): conversations and traces are scoped to the signed-in employee;
  `agent_conversation.title` may carry client_pii (`data_class`-tagged for the #1034
  admin-RLS policy).

## The app-wide sidecar (every other page)

Off `/jarvis`, the orchestrator rides along as the right-hand **sidecar** (`AgentPanel`).
Its conversation + `conversation_id` live in a shell-level `AgentSessionProvider`
(`src/components/agent/agent-session-context.tsx`, #1119) mounted once in `AppShell`, so the
thread **persists as you move page to page**, collapse/expand the panel, or pass through
`/jarvis` (where the sidecar is suppressed). It rehydrates from `sessionStorage`, so a reload
keeps the thread within the browser session; the durable ledger remains the backend's
(`agent_conversation`, ADR-0042).

## Related

Operator cockpit (action queue): [`technician-cockpit.md`](technician-cockpit.md). ICM run
viewer: `src/lib/agent/icm-runs.ts`.
