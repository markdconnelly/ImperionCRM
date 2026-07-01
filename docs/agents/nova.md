# Nova — the landing page & orchestrator front door

[← The AI suite](README.md) · Surface for the single-orchestrator model (CLAUDE.md §2.2,
backend ADR-0036/0080). Schema: FE #1064 (`agent_conversation`, `agent_run.conversation_id`).
The orchestrator persona is **Nova** (ADR-0131; runtime persona `icm/executive/orchestrator/nova.md`).

> **Name note (ADR-0016 / ADR-0131).** The orchestrator persona is **Nova**; the prior
> working name was "Jarvis." The FE surface was renamed to match ([#1672](https://github.com/markdconnelly/ImperionCRM/issues/1672)):
> the route `/nova`, the component `nova-console.tsx`, and `src/lib/agent/nova.ts`. The old
> `/nova` route **permanently redirects** to `/nova` (`next.config.mjs`) so existing
> bookmarks and deep links keep working. (Identity-bearing names — the `ImperionCRM` slug,
> Entra apps, DB names — are still retained verbatim per ADR-0016; the agent persona is not
> one of those.)

**Nova is the front door of Imperion OS** (#1118, epic #1038): the default page a user
lands on after authenticating, and the intended driver of work. On this route the
orchestrator is the *whole* screen — there is **no right-hand sidecar** (every other page
keeps it; AppShell suppresses it on `/nova`).

## The surface (`/nova`)

A codex-style three-pane console (`src/components/agent/nova-console.tsx`):

1. **Session history rail** (left) — the signed-in employee's past conversations
   (`agent_conversation`), newest activity first, with a **New conversation** button.
2. **Live chat** (center, the main focus) — the orchestrator turn loop. The composer
   sends through `askAgentAction` (backend ADR-0036) threaded by a per-session
   `conversation_id`; replies render inline. When a reply carries the generalized
   **`proposedActions[]` envelope** (backend #282, `{ kind, input, tier, dataClass, … }`),
   each action renders as an inline **approval card** (`ProposedActionCard`) — comms sends
   **and** non-comms actions (ticket update/reply, log-time) — labelled by its ADR-0055
   `tier` and ADR-0016 `dataClass`. Approving submits the envelope's `input` **verbatim** to
   the backend's only send path (`POST /agent/actions/execute`), which re-asserts consent
   (ADR-0058). Before forwarding, the envelope is resolved against the front-end
   **action-contract catalog** (`src/lib/agent/action-catalog.ts`, ADR-0107 D2 / [#994](https://github.com/markdconnelly/ImperionCRM/issues/994)):
   a *registered* action (`send_email`/`send_sms` migrated in) is schema-validated and a
   malformed payload is refused locally; an *unregistered* kind passes through to the backend
   (the authoritative validator/dispatcher) so the forward-verbatim contract (#1130) is
   preserved. A reply that flags approval but carries no renderable envelope (older deploy)
   still shows the plain notice. **Nothing is ever sent automatically.** *(The standalone
   operator action queue is the technician cockpit, [#1014](https://github.com/markdconnelly/ImperionCRM/issues/1014)
   — a separate surface; this is the per-turn inline affordance, #1130.)*
3. **Drill-in pop-out** (right, on demand) — selecting a past session opens its verbose
   **glass-box trace**: each `agent_run` (agent · status · cost) and its ordered
   `agent_message` stages (role · content · tool calls), so a human can drill into exactly
   what the agent did.

## Data sources

| Surface | Reads | Module |
|---|---|---|
| History rail | `agent_conversation` (scoped to `created_by`) | `src/lib/agent/nova.ts` |
| Drill-in trace | `agent_run` → `agent_message` by `conversation_id` | `src/lib/agent/nova.ts` |
| Live turn | backend orchestrator via `askAgentAction` | `src/lib/agent/ask-action.ts` |
| Proposed-action approval | the reply's `proposedActions[]` envelope; resolve+validate via the action-contract catalog, then approve → `POST /agent/actions/execute` (input verbatim) via `approveProposedAction` | `src/lib/agent/ask-action.ts` · `src/lib/agent/action-catalog.ts` · `src/components/agent/proposed-action-card.tsx` |

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

Off `/nova`, the orchestrator rides along as the right-hand **sidecar** (`AgentPanel`).
Its conversation + `conversation_id` live in a shell-level `AgentSessionProvider`
(`src/components/agent/agent-session-context.tsx`, #1119) mounted once in `AppShell`, so the
thread **persists as you move page to page**, collapse/expand the panel, or pass through
`/nova` (where the sidecar is suppressed). It rehydrates from `sessionStorage`, so a reload
keeps the thread within the browser session; the durable ledger remains the backend's
(`agent_conversation`, ADR-0042).

## Related

Operator cockpit (action queue): [`technician-cockpit.md`](technician-cockpit.md). ICM run
viewer: `src/lib/agent/icm-runs.ts`.
