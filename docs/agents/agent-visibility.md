# Agent visibility surface (`/org` + `/org/[agentId]`)

**Status:** built · admin-gated · read-only · issue #1612 (extends the `/org` viz #1539, epic #1534).

## What it is

The transparency surface for the Imperion OS agent org: **every agent is visible, with all its
settings, the procedures it performs, and the steps of each.** Two routes:

| Route | Renders | Source |
|---|---|---|
| `/org` | The react-flow org chart (Nova → 5 C-suite → 20 domain agents + the human layer) + a side panel of the selected agent's identity, settings, live state, and workflow/stage names. | `src/data/org-graph.json` (skeleton) + live Postgres overlay. |
| `/org/[agentId]` | One agent in full: identity + settings (ceiling, reports-to, tools, OKF rooms, live dial/rung/queue) and **every procedure** (workflow) with **every step** (stage) — each stage's job, process steps (with their `script`/`haiku`/`sonnet` execution tier), inputs, outputs, audit checks, and human-approval checkpoint. | `src/data/agent-procedures.json` + the node from `org-graph.json` + live overlay. |

Both are gated by `canSeeAgentPages` — the same admin predicate as the agent surfaces they
visualize. The `/org/[agentId]` page is a **Server Component**: the procedure artifact is ~600KB
of prose, so `loadAgentProcedures` is `server-only` and the detail never enters the `/org` client
bundle.

## Single source of truth → generated artifacts

There is **no `org_node` / `procedure` table** — that would be a second source of truth that
drifts. The org and its playbooks are defined once under `icm/` and **generated** at build time:

```
icm/org.yaml                         → org tree (orchestrator, executives, domains, humans)
icm/<tier>/<agent>/room.yaml         → tools + OKF-room budget, reports_to
icm/<tier>/<agent>/<wf>/agent.yaml   → workflow manifest: model, autonomy_rung, auto_may_self_approve, tools, okf_rooms, skills
icm/<tier>/<agent>/<wf>/CONTEXT.md   → workflow routing: title, Job, Trigger
icm/<tier>/<agent>/<wf>/stages/NN-*/CONTEXT.md → the step contract: Job, Process (tagged steps), Inputs, Outputs, Audit, Checkpoint
        │
        ▼  scripts/gen-org-graph.mjs   (zero-dep; reuses agent-yaml-gate's reader)
src/data/org-graph.json        (the skeleton the /org viz renders — kept lean)
src/data/agent-procedures.json (the per-agent procedure + step detail — server-only)
```

Regenerate after any `icm/` change: `npm run gen:org-graph`. CI runs `npm run gen:org-graph -- --check`
and fails if either artifact is stale — so the GUI can never silently drift from `icm/`.

Coverage at time of writing: **26 agents · 62 procedures · 188 stages.**

## Honest dormancy

The page shows what each agent *would* do and the autonomy ceiling it operates under. The **live
overlay** (actuation dial, ICM rung, pending-approval queue) reads defensively from Postgres; when
the DB is unreachable or empty it renders "propose-only / dormant." Real autonomous actuation stays
gated until the substrate hydrates — platform credentials seeded, Voyage recall (#389), and the
backend trigger-sync (#119). The surface never overstates an agent's live authority.

## Extending

- A new agent / workflow / stage appears automatically once its `icm/` files land and the graph is
  regenerated — no GUI change needed.
- The markdown reader in `gen-org-graph.mjs` expects the house format (`icm/CONVENTIONS.md`):
  `**Job:**`, `## Process` numbered steps with a leading `` `[tier]` `` tag, `## Inputs` pipe-table,
  `## Outputs`, `## Audit` checklist, optional `## Checkpoint`. Stages off-format degrade gracefully
  (empty section, never a crash).
