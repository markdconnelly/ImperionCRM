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
| 1 — domain *(= "workspace")* | — | `icm/domains/<domain>/room.md`: thin bounded-context prose for a staffed department (SoR posture, rooms, voice, default rung) |
| 2 — workflow | workflow `CONTEXT.md` | `icm/domains/<domain>/<workflow>/CONTEXT.md` (routing) **+ `agent.yaml`** (the declarative manifest) |
| 3 — stage contract | stage `CONTEXT.md` | `…/<workflow>/stages/NN-<name>/CONTEXT.md` |
| 3r — reference | `references/` | runtime skills (3 tiers, below) + OKF rooms + cited ADRs/docs + gold-layer reads |
| 4 — working artifacts | `output/` files | **Postgres run records, NOT files** — the repo holds the factory, the platform holds the product |

Layer 4 is the one structural deviation from upstream: run artifacts are rows
(human-readable markdown in the GUI, editable between stages), never committed
files. The runtime's Layer-0 system prompt is **composed by the backend loader**
from Constitution → domain `room.md` → workflow prose (ADR-0088 §2), not a single
file — and is never named `CLAUDE.md` (see Naming).

### Vocabulary — the OS-wide hierarchy (#1065)

The canonical agentic-OS hierarchy is **task → workflow → agent → workspace** (the
backend `CONTEXT.md` glossary, in `ImperionCRM_Backend`). Mapped onto ICM:

- **task** — a stage action/tool (a single job, Layer 3);
- **workflow** — an ICM **Layer-2** unit (`icm/domains/<domain>/<workflow>/`); it
  already *is* one business workflow (formerly called a "workspace" here);
- **agent** — an `agent.yaml` worker provisioned for a workflow;
- **workspace** — a staffed **department**, i.e. an ICM **domain**
  (`icm/domains/<domain>/`). "Workspace" and "domain" name the same thing.

The on-disk path stays `domains/` (cheap stability); only the *word* for Layer-2
changed (workspace → workflow), so one term means one thing across the OS.

## Tree structure

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

## The `agent.yaml` manifest (every workflow)

The CMA agent-object shape (ADR-0088). `system` is **composed** from prose files;
`model`/`tools`/`skills`/`mcp_servers`/`okf_rooms`/`autonomy_rung` are structured
fields where least-privilege is enforced. Required keys and the
`workflow ⊆ domain ⊆ Constitution` invariant are defined in
[CONSTITUTION.md §3](CONSTITUTION.md). The machine contract is
[`agent.schema.json`](agent.schema.json) (validated by
[`scripts/agent-yaml-gate.mjs`](../scripts/agent-yaml-gate.mjs), CI
`icm-conformance`); the field-by-field walkthrough is
[`docs/agents/agent-yaml-schema.md`](../docs/agents/agent-yaml-schema.md).

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
   - **OKF grounding marker (ADR-0104 §5).** A stage that grounds on a silver/gold
     entity — i.e. relies on its *meaning / which source wins / how it joins* before
     acting — **MUST** list that entity's OKF concept in its Inputs by tagging the
     row's Location cell with an `` `okf:<entity>` `` marker (e.g. `` `okf:contact` ``).
     This is the runtime-load guarantee: the authority rule is deterministically in
     context before the stage acts, and the audit trail proves it (the spine in
     ADR-0104 decision 3). Every `okf:<entity>` a stage grounds on **must** be in the
     workflow's `agent.yaml` `okf_rooms` allow-list — grounding outside the declared
     rooms is a least-privilege violation. The `icm-conformance` CI gate
     (`scripts/agent-yaml-gate.mjs`) enforces this. A stage that touches no silver
     meaning (pure skill/prior-output work) carries no marker.
3. **Process** — numbered steps. Mark how each step runs:
   - `[script]` — **deterministic executor code, no model call.** Mechanical work
     with a single correct answer: data fetch, field extraction by known key, file
     ops, dedupe lookups, cadence/date math, schema-shaped record assembly. Per the
     MWP paper's scripts-vs-AI split (arXiv:2603.16021, §below), if a step has one
     right output for a given input it is a script, not a prompt — running it as
     code is cheaper, faster, and exactly reproducible. Reserve model tiers for
     genuine interpretation.
   - `[haiku]` — mechanical work that still needs a model (light reading,
     fuzzy/judgment-lite extraction the cheap tier handles).
   - `[sonnet]` — judgment/drafting (ADR-0043 settled stack).
4. **Outputs** — artifact name + format. Plain markdown; the next stage's
   input. Every output is editable by a human before the next stage runs.
5. **Audit** — pass/fail checklist with unambiguous conditions. A failed audit
   parks the run, it never "best-efforts" forward.
6. **Checkpoint** (only where present) — what the human approves, and what
   `auto` mode is allowed to self-approve.

### Method note — scripts vs AI, and where checkpoints go

The marker scheme and checkpoint placement follow the MWP paper that the upstream
method draws on: Van Clief & McDermott, *"Interpretable Context Methodology: Folder
Structure as Agentic Architecture"* (arXiv:2603.16021, 2026).

- **Scripts-vs-AI split.** The paper separates deterministic mechanical work
  (`[script]` here) from work that needs a model. A step belongs in code, not a
  prompt, when its output is fully determined by its input — spending a model call
  on it adds cost, latency, and a chance of drift for no interpretive gain. Mark
  such steps `[script]`; reserve `[haiku]`/`[sonnet]` for steps that genuinely
  interpret.
- **U-shaped intervention finding.** The paper reports that human/checkpoint
  intervention concentrates at the **start and end** of a pipeline (highest early,
  where inputs are ambiguous, and at the final send/commit gate) and is lowest in
  the middle — a U shape. This is supporting evidence for our checkpoint placement:
  classification/triage scrutiny up front and an approval gate before any outbound
  send (stage 04-class, ADR-0058), with mechanical mid-stages left to run.

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
- **Goldens are part of a new agent's artifact set** (#1538). A new agent's
  build PR ships two eval goldens — a grounding/no-fabrication case and a
  park-or-delegate guardrail — plus its `eval/baselines.json` entry, in the same
  change set as its `room.yaml`/persona/workflow. The standard + the seed pattern
  are [`docs/agents/eval-quality-plane.md`](../docs/agents/eval-quality-plane.md) §5b.

## Naming

Domain slugs are kebab-case business areas (`finance`, `sales`, `service-desk`).
Workflow slugs are kebab-case business names (`lead-response`, `expense-close`).
Stage folders `NN-verb-noun`. Runtime skill files are kebab-case nouns
(`voice-and-tone.md`). Composed prose files are `room.md` (domain) and `prose.md`
(workflow) — **never `CLAUDE.md`**: that name auto-loads in the Claude Code dev
tool during dry-runs and would pull whole-tier context when a single stage is
wanted; the runtime loader reads by explicit `system_compose` path regardless.
Dev-facing Claude Code skills stay in `plugins/imperion-skills/`.
