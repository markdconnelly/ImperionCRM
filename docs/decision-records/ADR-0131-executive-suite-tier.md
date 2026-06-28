---
adr: 0131
title: "Executive Suite tier — orchestrator + C-suite as delegate-only agents above domains"
status: proposed
date: 2026-06-28
repo: frontend
summary: "Introduce a structural tier ABOVE icm/domains/: a single feminine orchestrator (Nova, replacing Jarvis) and five C-suite agents, each living in icm/executive/<role>/ with the same anatomy as a domain. The org tree (orchestrator -> execs -> divisions -> member domains + human pairings) is data in icm/org.yaml — the single source of truth the GUI and conformance derive from, not a DB schema. C-suite agents are delegate-only: their room.yaml budgets grant no direct-actuation tools (only pg.read + retrieval + a delegate/handoff capability + synthesis), which structurally enforces their L2 ceiling — they orchestrate, synthesize, and advise a human; sub-agents act, and the sub-agents' gauntlets apply."
tags: [agents, governance]
---

# ADR-0131: Executive Suite tier — orchestrator + C-suite as delegate-only agents above domains

> Number claimed at MERGE per system CLAUDE.md §10.3. Authored against the
> placeholder `NNNN`; just before merge the branch is rebased on current `main`,
> the next free ADR number is taken, this file is renamed, and every reference is
> fixed. No global counter is reserved at authoring time.

| Field | Value |
|---|---|
| **Repo** | frontend (owns `icm/`, the org tree, and the conformance gate); backend reads delegated handoffs at dispatch |
| **Status** | Proposed |
| **Date** | 2026-06-28 |
| **Cross-references** | [ADR-0128](ADR-0128-canonical-agent-autonomy-ladder.md) (the L0–L5 ladder every agent maps onto), [ADR-0109](ADR-0109-actuation-autonomy-dial.md) (the dial + hard ceilings), [ADR-0118](ADR-0118-data-class-third-rls-axis-action-ceiling.md) (always-gate `data_class`es), [ADR-0088](ADR-0088-icm-self-hosted-managed-agents-runtime.md) (the Managed-Agents runtime + least-privilege budgets), [ADR-0087](ADR-0087-agent-orchestration-and-observability-layer.md) (one orchestrator, observability), [ADR-0086](ADR-0086-okf-semantic-layer-over-silver.md) (OKF rooms) |

## Problem

The agent roster is growing from a flat set of eight domain agents (Felix, Chase,
Belle, Audrey, Vance, Pierce, Celeste, Vera — each an `icm/domains/<dept>/` agent) to
a **26-agent organization**: one orchestrator, five C-suite leaders, and twenty
sub-agents, for a security-minded MSP that intends to run and scale the business on
AI leverage. A flat "the orchestrator summons any of 26 peers" model does not scale —
it gives the orchestrator an unbounded fan-out, gives an operator no legible
management structure, and gives the platform no place to express *who answers to whom*
or *which human each part of the org serves*.

We need a **management tier** between the single orchestrator and the doing agents.
But the existing ICM structure (`icm/domains/<dept>/` = `room.md` + `room.yaml` budget
+ persona + workflow playbooks, composed `Constitution → room → persona → prose`,
gated by `icm-conformance`'s `workflow ⊆ domain ⊆ Constitution` subset invariant) only
models **doers** — agents that read scoped data and actuate through approval-gated
tools. The orchestrator and the C-suite are a *different kind of thing*: they
**orchestrate, synthesize, and advise a human — they do not directly actuate on the
world**; they delegate to sub-agents, and those sub-agents' gauntlets are what govern
the actual actions. There is no tier, and no vocabulary, for that today.

## Context

- **The single-orchestrator principle (ADR-0087, CLAUDE.md §2) stands.** This ADR does
  not add a second user-facing brain; it gives the one orchestrator (Nova, the
  feminine successor to Jarvis) a structured set of executives to route *through*
  instead of a flat peer list.
- **The canonical ladder (ADR-0128) is the autonomy contract.** Every agent — including
  the executives — maps onto L0–L5 with a dial-proof `always_gate` ceiling. The
  executives sit at **L2**: they may auto-execute internal, reversible synthesis
  (briefs, prioritization), but every world-changing act is delegated to a sub-agent,
  whose own ladder + gauntlet then governs it.
- **ICM budgets are least-privilege and structural (ADR-0088).** A `room.yaml` lists
  the tools and OKF rooms an agent may use, and `icm-conformance` enforces
  `workflow ⊆ domain ⊆ Constitution`. We can therefore make "delegate-only" a
  **structural** property — grant no actuation tools — rather than a prose promise.
- **The handoff substrate already exists.** The backend `relationship.*` handoff event
  bus (backend W7 / #437) is how one agent hands work to another. A C-suite agent's
  "delegate" is an emit on that bus, not a new actuation path.
- **The GUI must render the whole org** (a `/org` visualization + structure browser is
  a sibling requirement). It needs a single, authoritative description of the org tree
  to draw — derived from the same files the runtime uses, so the picture cannot drift
  from reality.

## Options considered

1. **Metadata-only tier flag** (rejected). Keep all 26 agents in `icm/domains/`, add a
   `tier: executive` flag and a `reports_to` field. Pro: fewest new moving parts. Con:
   blurs doers and orchestrators in one namespace; the GUI and a reader must *infer*
   the hierarchy from flags rather than see it; "delegate-only" stays a convention, not
   a structure. Loses the clarity the recast exists to create.
2. **Division-nested directory layout** (rejected). `icm/divisions/<division>/` with the
   C-suite persona and the member domains physically nested beneath it. Pro: the tree
   literally is the org. Con: over-nests, deep paths, and fights the flat domain model
   the conformance gate and every existing tool assume; a large, risky refactor of
   paths for marginal gain.
3. **A new `icm/executive/` tier + an `icm/org.yaml` org map** (chosen). The executives
   are first-class agents in a sibling directory reusing the exact domain anatomy; the
   reporting/division structure is data in one file. Reuses the proven factory and CI
   gates with minimal new machinery; the directory signals the tier; the org map is one
   legible source of truth.

### Tradeoffs

The chosen option asks each domain to declare a `reports_to` and asks the conformance
gate to learn one new rule, in exchange for: a clean doer/orchestrator separation, a
single authoritative org map the GUI derives from, and a *structural* (not prose)
guarantee that the executives cannot actuate. The alternatives trade that structure
away for fewer files (1) or accept a costly path refactor (2).

## Decision

### D1 — A new `icm/executive/<role>/` tier, same anatomy as a domain

The orchestrator and each C-suite agent live in `icm/executive/<role>/` (e.g.
`icm/executive/nova/`, `icm/executive/cto/`), each with the **same anatomy as an
`icm/domains/` agent** — `room.md`, `room.yaml` (budget), the persona file, and one or
more workflow playbooks composed `Constitution → room → persona → prose`. The existing
factory, schema, and `icm-conformance` gate apply unchanged except for D4. `domains/`
remains the doers; `executive/` is the orchestrate/advise tier.

### D2 — The org tree is data, in `icm/org.yaml`

A single `icm/org.yaml` is the **source of truth** for the org structure:
`orchestrator → executives → divisions → member domains`, plus the **human each
executive serves**. The GUI `/org` visualization and structure browser **derive** from
it (via a build-time generator over `icm/**`), and `icm-conformance` reads it (D4).
There is **no `org_node` database schema** — the org structure is config in the repo,
versioned with the agents it describes, so the picture cannot drift from the runtime.

### D3 — The C-suite are delegate-only (the ceiling is a budget, not a sentence)

An executive's `room.yaml` grants **no direct-actuation tools** — no `send.*`, no
`ticket.note`, no write capability of any kind. It may grant only: `pg.read` (broad
read), the **retrieval tier** (`knowledge.search` / `memory.recall`, granted per the
worker-retrieval ADR), a new **`delegate` / `handoff`** capability (an emit on the
`relationship.*` bus), and synthesis. Because `icm-conformance` already enforces that a
workflow's tools are a subset of its room's, "an executive cannot actuate" becomes a
**structural invariant**, not a promise in prose. This *is* the ADR-0128 **L2 ceiling**
made concrete for the executive tier: they synthesize and delegate; **the sub-agent
they hand to is what acts, and that sub-agent's ladder + gauntlet govern the action.**
The orchestrator (Nova) is the same shape, one level up: it routes across executives
and never self-approves what a downstream agent could not.

### D4 — Conformance gains two checks

`scripts/agent-yaml-gate.mjs` (the `icm-conformance` gate) adds:

1. **`reports_to` resolves.** Every `icm/domains/<dept>/` agent declares a `reports_to`
   that must resolve to an executive in `icm/org.yaml`; every executive resolves to the
   orchestrator. An unresolved or missing `reports_to` fails CI.
2. **Executive budgets are delegate-only.** Any `icm/executive/<role>/` budget that
   grants a direct-actuation tool (anything beyond read + retrieval + delegate +
   synthesis) fails CI. The ceiling cannot be widened by editing a budget.

### D5 — Each executive serves a named human

The org is built to **augment specific humans**, so `icm/org.yaml` records the human(s)
each executive primarily serves (e.g. Chief of Staff → Derek, Deputy CISO → Mark,
Deputy CFO → Nick). This pairing is advisory metadata — it drives who an executive's
briefs are *for* and surfaces in the GUI; it grants no permissions (permissions remain
the caller's, ADR-0016 never-exceed-the-caller).

### D6 — The executive playbook archetype is the synthesis brief

An executive's first/tracer workflow is a **scheduled cross-division synthesis brief
for its human** — read broadly (D3), recall context, summarize state + risks +
decisions-needed, deliver to the human. It is the natural L2, delegate-only shape: it
reads and synthesizes, it does not act. (Sub-agents' tracers, by contrast, are
event-driven doers.)

## Consequences

### Security impact

- **The executive ceiling is structural, not aspirational.** Delegate-only budgets +
  the conformance check mean an executive — or the orchestrator — *cannot* actuate even
  if its persona or a workflow tried to; the only path to the world is delegating to a
  sub-agent whose own gauntlet (ADR-0128/0109/0118) then applies. The highest-leverage,
  broadest-context agents add **zero new actuation surface**.
- **No orchestrator bypass.** Nova routes and synthesizes; it never self-approves a
  downstream action. The single-orchestrator model (ADR-0087) keeps one front door
  without making that front door a privilege escalation.
- **Least privilege is preserved end to end** — the `workflow ⊆ domain/executive ⊆
  Constitution` invariant now covers the new tier too.

### Cost impact

- None structural — no new runtime services. The executives are read-and-synthesize
  agents, so their workflows are additional (mostly scheduled) model calls for briefs;
  modest and bounded by the orchestrator budget (ADR-0087).

### Operational impact

- **`icm/org.yaml` becomes a first-class artifact** the GUI `/org` surface and the
  conformance gate both read. Changing the org = editing one file in a PR.
- **`icm-conformance` gains the two D4 checks**; existing domains must add a
  `reports_to` (handled by the "wire existing 8 into org.yaml" issue).
- **Jarvis → Nova.** `docs/agents/jarvis.md` is renamed/rewritten as the Nova
  orchestrator doc; the orchestration matrix (ADR-0087) is updated to show the
  executive tier.
- **This is the template for the executive build-out** — Nova + five C-suite agents
  each get an `icm/executive/<role>/` directory + the synthesis-brief tracer, following
  this ADR the way the per-agent epics follow ADR-0128's ladder.

## Future considerations

- The deeper executive playbook libraries (beyond the first synthesis-brief tracer) —
  cross-agent prioritization, escalation synthesis, exec reporting — are follow-ups per
  executive.
- The GUI `/org` legend (what each tier/agent can do, derived from budgets + the ladder)
  is a sibling surface.
- Whether a division that outgrows ~8 sub-agents warrants an intermediate lead is left
  open; the flat C-suite → sub-agent span is deliberate for the current size and revisited
  only if a division sprawls.
