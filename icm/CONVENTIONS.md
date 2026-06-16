# ICM conventions — Imperion adaptation (ADR-0061, amended by ADR-0088)

How Imperion applies the Interpreted Context Methodology
(github.com/RinDig/Interpreted-Context-Methdology). Upstream principle kept
verbatim where possible; deviations are deliberate and noted. ADR-0088 adds the
**domain tier**, the declarative **`agent.yaml`** manifest, and the
[Constitution](CONSTITUTION.md); the runtime is **self-hosted Managed Agents**
(Anthropic runs the loop, tools execute on our infra).

## The layer map (Imperion edition)

| ICM layer | Upstream | Here |
|---|---|---|
| 0a — constitution | — | [`icm/CONSTITUTION.md`](CONSTITUTION.md): the inherited contract every domain/workflow obeys (governance/identity/observability/data-platform wrappers, the non-negotiables) |
| 0b — dev orientation | CLAUDE.md | [`icm/CLAUDE.md`](CLAUDE.md): how Claude Code MOVES through the tree (dry-runs); not the runtime's brain |
| 1 — domain | — | `icm/domains/<domain>/room.md`: thin bounded-context prose (SoR posture, rooms, voice, default rung) |
| 2 — workspace | workspace `CONTEXT.md` | `icm/domains/<domain>/<workflow>/CONTEXT.md` (routing) **+ `agent.yaml`** (the declarative manifest) |
| 3 — stage contract | stage `CONTEXT.md` | `…/<workflow>/stages/NN-<name>/CONTEXT.md` |
| 3r — reference | `references/` | runtime skills (3 tiers, below) + OKF rooms + cited ADRs/docs + gold-layer reads |
| 4 — working artifacts | `output/` files | **Postgres run records, NOT files** — the repo holds the factory, the platform holds the product |

Layer 4 is the one structural deviation from upstream: run artifacts are rows
(human-readable markdown in the GUI, editable between stages), never committed
files. The runtime's Layer-0 system prompt is **composed by the backend loader**
from Constitution → domain `room.md` → workflow prose (ADR-0088 §2), not a single
file — and is never named `CLAUDE.md` (see Naming).

## Workspace structure

```
icm/
  CONSTITUTION.md                       # Layer 0a: the inherited contract
  CLAUDE.md                             # Layer 0b: dev-tool/dry-run orientation
  CONVENTIONS.md                        # this file
  skills/
    <skill-slug>.md                     # TIER 1 — cross-domain shared runtime skills
  domains/
    <domain-slug>/                      # Layer 1 — bounded context (finance, sales, …)
      room.md                           # thin domain prose (composed into `system`)
      skills/
        <skill-slug>.md                 # TIER 2 — domain-shared runtime skills
      <workflow-slug>/
        CONTEXT.md                      # Layer 2: trigger, stage order, autonomy notes
        agent.yaml                      # the declarative manifest (see below)
        prose.md                        # workflow system prose (composed into `system`)
        stages/
          01-<stage>/CONTEXT.md         # Layer 3 contracts; number = execution order
        skills/
          <skill-slug>.md               # TIER 3 — workflow-local runtime skills
```

## The `agent.yaml` manifest (every workspace)

The CMA agent-object shape (ADR-0088). `system` is **composed** from prose files;
`model`/`tools`/`skills`/`mcp_servers`/`okf_rooms`/`autonomy_rung` are structured
fields where least-privilege is enforced. Required keys and the
`workflow ⊆ domain ⊆ Constitution` invariant are defined in
[CONSTITUTION.md §3](CONSTITUTION.md).

```yaml
name: expense-close
model: claude-opus-4-8
system_compose:                 # ordered; MUST start Constitution → domain room
  - ../../CONSTITUTION.md
  - ../room.md
  - ./prose.md
okf_rooms: [expense_item, expense_report]   # ⊆ domain.okf_rooms
tools: [...]                    # ⊆ domain.tools
skills: [icm/skills/voice-and-tone, domains/finance/skills/close-rules, ./skills/categories]
autonomy_rung: L2
auto_may_self_approve: "clean-audit reimbursements with existing category mapping"
mcp_servers: [...]              # optional; creds via vaults, never inline
```

## Three runtime skill tiers (+ dev skills — don't mix)

| Tier | Home | Promote when |
|---|---|---|
| **1 — cross-domain** | `icm/skills/` | a 2nd **domain** needs it |
| **2 — domain-shared** | `domains/<d>/skills/` | a 2nd **workflow in the domain** needs it |
| **3 — workflow-local** | `domains/<d>/<wf>/skills/` | — |

Promote one tier up the moment a second consumer needs it; leave a one-line
pointer behind. Cite skills by path (`icm/skills/<slug>.md`,
`domains/<d>/skills/<slug>.md`, `./skills/<slug>.md`). These are the agent
workforce's runtime knowledge. **Developer skills** are separate: they live in
`plugins/imperion-skills/` (ADR-0060), are loaded by Claude Code (the build crew),
and never mix with runtime skills.

## Stage contract format (every stage CONTEXT.md)

1. **Job** — one sentence; one stage, one job. If a stage needs "and", split it.
2. **Inputs** — a table: `| Source | Location | Scope | Why |`. Load nothing
   that isn't listed (layered context loading is the cost model).
3. **Process** — numbered steps. Mark the model tier: `[haiku]` mechanical,
   `[sonnet]` judgment/drafting (ADR-0043 settled stack).
4. **Outputs** — artifact name + format. Plain markdown; the next stage's
   input. Every output is editable by a human before the next stage runs.
5. **Audit** — pass/fail checklist with unambiguous conditions. A failed audit
   parks the run, it never "best-efforts" forward.
6. **Checkpoint** (only where present) — what the human approves, and what
   `auto` mode is allowed to self-approve.

## Rules

- **One-way references:** stage N may cite stages < N, the workflow's `room.md`,
  and `skills/`; never forward, never circular. A workflow cites its domain;
  a domain cites the Constitution — never the reverse.
- **Canonical sources:** a fact/rule lives in ONE file at ONE tier; lower tiers
  cite, never restate. If a skill restates an ADR, the skill is wrong; if a
  workflow restates a domain rule, the workflow is wrong.
- **Least privilege is structural:** `tools`/`okf_rooms` are allow-lists in
  `agent.yaml`, subset-bounded by the domain. Never widen at the workflow tier.
- **Specs prescribe WHAT and WHEN, not HOW** — leave the wording/judgment to
  the model within the contract.
- **Checkpoints and the autonomy dial:** every workflow starts `draft` (all
  checkpoints human-approved). The per-workflow flip to `auto` is admin-only,
  audited, reversible, read from `autopilot_policies` (ADR-0061/0087). Contracts
  must state what `auto` may self-approve — anything unstated parks for a human.
- **Sends exit through ADR-0058** (approval-gated, consent re-asserted). No stage
  talks to an external party by any other route.
- **No secrets, no client PII** in any `icm/` file (ADR-0060; these files
  replicate everywhere). Reference data by id/location, not by value.
- **Changing a workflow/domain/Constitution = issue → micro-PR.** Definitions
  are code; conformance is gated by CI (`icm-conformance`, #702).

## Naming

Domain slugs are kebab-case business areas (`finance`, `sales`, `service-desk`).
Workflow slugs are kebab-case business names (`lead-response`, `expense-close`).
Stage folders `NN-verb-noun`. Runtime skill files are kebab-case nouns
(`voice-and-tone.md`). Composed prose files are `room.md` (domain) and `prose.md`
(workflow) — **never `CLAUDE.md`**: that name auto-loads in the Claude Code dev
tool during dry-runs and would pull whole-tier context when a single stage is
wanted; the runtime loader reads by explicit `system_compose` path regardless.
Dev-facing Claude Code skills stay in `plugins/imperion-skills/`.
