# Imperion OS agent org structure (Executive Suite + domains)

> Status: foundation landed (#1536). Source of truth for the tree is
> [`icm/org.yaml`](../../icm/org.yaml); this doc is the human-readable companion.
> Decision: the Executive-Suite tier ADR (#1535). Ladder: ADR-0128.

## The three tiers

```
                        Nova  (orchestrator — the one agent a human talks to)
                          │  delegate-only; routes & synthesizes; never actuates
        ┌─────────────┬───┴────────┬──────────────┬──────────────┐
     Rachel        Dexter        Roman         Sterling        Jessica
   Chief of Staff    CTO       Deputy CISO    Deputy CFO    Chief Risk Officer
   (Internal Ops)  (Delivery)  (Security)   (Revenue/Fin)   (Plat & Assurance)
        │             │            │              │               │
   people,legal  service,noc,   soc,grc,    sales,marketing,  platform,
                 problem-mgmt,  identity    client-success,   service-quality,
                 change-release,            procurement,      knowledge
                 dispatch,bcdr,             finance
                 projects
```

- **Tier 0 — orchestrator (Nova).** The single user-facing agent (ADR-0087,
  core principle §2.2). Replaces the prior "Jarvis" working name. Delegate-only.
- **Tier 1 — Executive Suite (5 C-suite).** Each runs a division: aggregates,
  synthesizes a pulse/brief for the human it serves, and delegates work down.
  **Delegate-only** budgets → the ADR-0128 **L2 ceiling is structural** (#1535).
- **Tier 2 — domains (the doers).** The 8 existing agents + 12 new ones. Each
  acts under its own gauntlet, dial, and autonomy ceiling.

## The roster (26 agents)

| Agent | Role / domain | Reports to | Serves | Ceiling |
|---|---|---|---|---|
| Nova | orchestrator | — | company | L2 delegate-only |
| Rachel | Chief of Staff | Nova | Derek | L2 delegate-only |
| Dexter | CTO | Nova | Derek/Mark/Luke/Brandon/Anna | L2 delegate-only |
| Roman | Deputy CISO | Nova | Mark | L2 delegate-only |
| Sterling | Deputy CFO | Nova | Nick | L2 delegate-only |
| Jessica | Chief Risk Officer | Nova | Mark | L2 delegate-only |
| Felix | service | Dexter | — | L1 |
| Ozzie | noc | Dexter | — | L4 |
| Sage | problem-mgmt | Dexter | — | L3 |
| Marshall | change-release | Dexter | — | L2 (gate) |
| Scout | dispatch | Dexter | — | L3 |
| Phoenix | bcdr | Dexter | — | L3 |
| Pierce | projects | Dexter | — | L2 |
| Cyrus | soc | Roman | — | L4 |
| Grace | grc | Roman | — | L2 |
| Osiris | identity | Roman | — | L3 |
| Chase | sales | Sterling | — | L3 |
| Belle | marketing | Sterling | — | L2 |
| Celeste | client-success | Sterling | — | L3 |
| Vance | procurement | Sterling | — | L2 |
| Audrey | finance | Sterling | — | L2 (read-only) |
| Vera | platform | Jessica | — | L2 (watcher) |
| Tess | service-quality | Jessica | — | L2 (watcher) |
| Alivia | knowledge | Jessica | — | L3 |

Domain ceilings are the agent's **persona ceiling**; a per-workflow `agent.yaml`
`autonomy_rung` is `L0`–`L3` and narrows from it. The `built` flag in
`icm/org.yaml` marks which domains have a `room.yaml` today; the rest are
scaffolded by their epics (#1551–1562).

## Conformance (the gate makes the tree real)

`scripts/agent-yaml-gate.mjs` (CI `icm-conformance`) enforces, beyond the
existing `workflow ⊆ domain ⊆ Constitution` subset:

1. **`reports_to` resolves.** Every domain `room.yaml` → a C-suite role dir under
   `icm/executive/`; every executive → `orchestrator`; the orchestrator → none.
2. **Delegate-only executives.** An executive `room.yaml` may grant only
   `{pg.read, knowledge.search, memory.recall, delegate, handoff}` — no actuation
   tool. Nothing to auto-execute ⇒ the L2 ceiling cannot be dialed past.

## Retrieval tier (#1537)

`knowledge.search` (OKF-grounded semantic recall over gold) and `memory.recall`
(deliberate captures, ADR-0116) are read-only capabilities granted per
`room.yaml`. Doctrine (CONSTITUTION.md §8): structured reads for facts, semantic
recall for context, always cite, never fabricate. Returns nothing until the gold
vector store is hydrated (LP #389).
