# ICM conventions — Imperion adaptation (ADR-0061)

How Imperion applies the Interpreted Context Methodology
(github.com/RinDig/Interpreted-Context-Methdology). Upstream principle kept
verbatim where possible; deviations are deliberate and noted.

## The layer map (Imperion edition)

| ICM layer | Upstream | Here |
|---|---|---|
| 0 — system | CLAUDE.md | Orchestrator system context (backend ADR-0036) |
| 1 — workspace routing | workspace `CONTEXT.md` | `icm/workspaces/<workflow>/CONTEXT.md` |
| 2 — stage contract | stage `CONTEXT.md` | `icm/workspaces/<workflow>/stages/NN-<name>/CONTEXT.md` |
| 3 — reference material | `references/` | Runtime skill bundles in `skills/` + cited ADRs/docs + gold-layer reads |
| 4 — working artifacts | `output/` files | **Postgres run records, NOT files** — the repo holds the factory, the platform holds the product |

Layer 4 is the one structural deviation from upstream: run artifacts are rows
(human-readable markdown in the GUI, editable between stages), never committed
files. Everything else follows upstream.

## Workspace structure

```
icm/
  CONVENTIONS.md                      # this file
  workspaces/
    <workflow-slug>/
      CONTEXT.md                      # Layer 1: what this workflow is, trigger, stages, autonomy notes
      stages/
        01-<stage>/CONTEXT.md         # Layer 2 contracts; number = execution order
        02-<stage>/CONTEXT.md
      skills/
        <skill-slug>.md               # Layer 3 runtime knowledge the stages cite
```

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

- **One-way references:** stage N may cite stages < N and `skills/`; never
  forward, never circular.
- **Canonical sources:** a fact/rule lives in ONE file; others cite it. If a
  skill restates an ADR, the skill is wrong.
- **Specs prescribe WHAT and WHEN, not HOW** — leave the wording/judgment to
  the model within the contract.
- **Checkpoints and the autonomy dial:** every workflow starts `draft` (all
  checkpoints human-approved). The per-workflow flip to `auto` is admin-only,
  audited, reversible (ADR-0061). Contracts must state what `auto` may
  self-approve — anything unstated parks for a human even in `auto`.
- **Sends exit through ADR-0058** (approval-gated path, consent re-asserted).
  No stage talks to an external party by any other route.
- **No secrets, no client PII** in any `icm/` file (ADR-0060 rule; these files
  replicate everywhere). Reference data by id/location, not by value.
- **Changing a workflow = issue → micro-PR.** Definitions are code.

## Naming

Workflow slugs are kebab-case business names (`lead-response`,
`backup-monitor`). Stage folders `NN-verb-noun`. Runtime skill files are
kebab-case nouns (`voice-and-tone.md`). Dev-facing Claude Code skills stay in
`plugins/imperion-skills/` — runtime skills here are content FOR the product's
agents, not for Claude Code.
