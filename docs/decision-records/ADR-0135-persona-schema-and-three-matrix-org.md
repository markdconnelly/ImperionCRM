---
adr: 0135
title: "Persona schema, the three-matrix agent model, and the public org chart"
status: proposed
date: 2026-06-29
repo: frontend
summary: "One persona standard for the whole hybrid workforce. An agent is composed of three INTERTWINING matrices joined on agent_key — Personality (the persona .md, 7 fixed sections), Capabilities (agent.yaml/room.yaml + workflow dirs), and the Autonomy ladder (per-workflow setting under agent-level hard caps) — plus a metrics binding. The persona is PERSONALITY ONLY and never originates rules: authority flows org.yaml (ceiling) + policy §5 (rules) -> persona (binds/tightens, cites upstream) -> agent.yaml (derived). Personas are full impersonations (internal app), overriding ADR-0091's never-impersonation for the agent matrix (the board feature is separate). Humans use the same 7 personality sections + 4 human-only sections (decision authority bound to policy §5 = the approver-side of agent always_gate) + the same metrics binding, so human-vs-agent productivity is comparable. org.yaml becomes the single org-chart SoT (agent tree + a humans block + human_manager per agent + public render fields) feeding the app and a public promo chart; the org chart is classified public-approved PII. Every human-in-the-loop gate has one of two origins: policy-backed (cite the policy §; gaps are fixed by updating policy, only Mark+Derek edit it) or technical-limitation (documented in a README-linked reference doc, typically temporary)."
tags: [governance, agents, persona, org]
---

# ADR-0135: Persona schema, the three-matrix agent model, and the public org chart

> Number claimed at MERGE per system CLAUDE.md §10.3. Authored against the placeholder `NNNN`;
> current max is 0134 — take the next free number at merge, rename the file, and fix every
> `ADR-0135` reference (icm/CONVENTIONS.md, docs/agents/agent-roster.md, the persona files).

| Field | Value |
|---|---|
| **Repo** | frontend (owns `icm/`, the schema, the org SoT, and the docs tree) |
| **Status** | Proposed |
| **Date** | 2026-06-29 |
| **Cross-references** | [ADR-0131](ADR-0131-executive-suite-tier.md) (the org tier), [ADR-0128](ADR-0128-canonical-agent-autonomy-ladder.md) (L0–L5 ladder), [ADR-0109](ADR-0109-actuation-autonomy-dial.md) (dial + hard ceilings), [ADR-0118](ADR-0118-data-class-third-rls-axis-action-ceiling.md) (always-gate data-classes), [ADR-0134](ADR-0134-policy-canon-architecture.md) (policy canon = the rule SoT), [ADR-0091](ADR-0091-agent-icm-platform-consolidated.md) (overridden here for the internal matrix), [ADR-0088](ADR-0088-icm-self-hosted-managed-agents-runtime.md) (system composition) |

## Problem

Imperion runs on a hybrid workforce — 26 AI agents (ADR-0131) + 7 human staff. The 26 agent
persona files were built tracer-quality and drift: some bundle the autonomy ladder, data scope,
and metrics into the personality prose; others omit sections. Two source-of-truth claims also
collided — `docs/agents/agent-roster.md` ("persona prose is the SoT; config derives
prose→agent.yaml") versus the policy canon (ADR-0134: every policy §5 "Application to Autonomous
Agents" defines the agent's ceiling, `always_gate`, escalation, evidence). And there was no
employee-persona standard at all, nor a single org chart that carries both agents and humans for
the app and a public promo surface.

## Decision

### 1. Layered source-of-truth — the persona never originates rules
Authority flows top-down; a persona may only TIGHTEN, never loosen, and every guardrail / metric /
cap line cites its upstream (uncited = conformance failure):
1. **`org.yaml`** owns the org chart + each node's hard-cap `ceiling`. The persona cites, never raises.
2. **Policy canon §5** (ADR-0134) owns the RULES — `always_gate` classes, escalation, evidence,
   data-classes. One definition, cross-domain. **Policies are never regenerated from personas; only
   Mark + Derek edit policy.** Agents AND humans adhere to policy.
3. **Persona `.md`** owns the agent-specific synthesis + behaviour, bound to (1) and (2).
4. **`agent.yaml` / `room.yaml`** are derived from the persona prose, bounded above by (1) and (2).

### 2. An agent = three intertwining matrices + a metrics binding, joined on `agent_key`
Persona ≠ approval ladder ≠ capabilities. They are separate, clean surfaces:
- **Org node (`org.yaml`):** name · title · division · persona ref · `reports_to` (agent manager) ·
  `human_manager` · hard-cap ceiling · public render summary.
- **Matrix A — Personality (`persona.md`):** 7 behavioural sections, independent of the ladder —
  **Identity & mandate · Origin & character · How you work · Voice & tone · Grounding & uncertainty ·
  Behavioural guardrails (policy-bound) · Boundaries & seams.** Carries frontmatter
  (`type · surface · agent_key · status · version · valid_from · content_hash`) so each persona is
  versioned and tunable; the fixed headings make each section independently addressable.
- **Matrix B — Capabilities (`agent.yaml` + workflow dirs + `room.yaml`):** workflows · tasks ·
  skills + scope (data_classes · okf_rooms · tools).
- **Matrix C — Autonomy ladder (uniform L0–L5, ADR-0128):** hard caps are AGENT-level &
  workflow-independent (ceiling + `always_gate`, from policy §5) and inform every workflow; the
  ladder SETTING is PER-WORKFLOW (≤ agent ceiling, the `agent.yaml` autonomy_rung); the derived
  agent metric **autonomous %** = mean(workflow dial ÷ 5) across active workflows (volume-weighted
  later).
- **Metrics binding:** per-agent selection of effectiveness-metric-catalog IDs + targets (a global
  set — exec-count / first-time-success / feedback-then-success / rejection / autonomous % — plus
  per-division metrics); feeds the BI layer, which aggregates up the `org.yaml` `reports_to` tree.

The persona authors autonomy in ONE vocabulary (L0–L5); the runtime dial (ADR-0109, 1–5) and the
orchestration `autonomy_rung` (a SEPARATE axis, not actuation) never appear in a persona.

### 3. Full impersonation for the internal agent matrix (overrides ADR-0091 here)
The matrix is an internal app; agents are full, fully-realized employee personas with demographics
and origin stories (uniform depth, all 26). This overrides ADR-0091's "personas are influence
profiles, never impersonation" **for the internal agent matrix only**. The public-facing **board
feature** (impersonating real named figures) is a separate feature, out of scope here.

### 4. One schema, two surfaces (agents and humans), measured alike
Humans use the same 7 personality sections (with §2 holding their REAL "Background & character")
+ 4 human-only sections — **Decision & commitment authority** (binds policy §5 classes — the
approver-side of agent `always_gate`; $ thresholds deferred for v1) · Ownership & delegation ·
Agent-pairing contract · Knowledge sources — + the same metrics binding, so human-vs-agent
productivity is apples-to-apples per business area. Employee personas live in `icm/employees/` (the
Imperion OS brain), NOT ImperionBrainMark (personal brains are a separate branch).

### 5. The two-origin gate taxonomy + traceability
Every human-in-the-loop gate has exactly one origin:
1. **Policy-backed** — binds to a policy §5 class; the feature's docs cite the policy. A missing
   rule is fixed by **updating the policy** (Mark + Derek), never invented in a persona.
2. **Technical-limitation** — a technical constraint warrants HITL until the capability lands;
   documented in a **README-linked reference doc** (`docs/reference/technical-limitations.md`),
   typically temporary (the "deploy-dormant" pattern). May later be structured into the database.
A gate tracing to neither is a policy gap to fill.

### 6. The org chart is the single SoT for the app + public promo, and is public-approved
`org.yaml` carries the agent tree AND a `humans:` block (the 7 staff) + a `human_manager:` on every
agent node + `title`/`summary` render fields. The org-graph generator (`scripts/gen-org-graph.mjs`)
emits humans as a parallel layer (`graph.humans[]`) so the agent-tree invariants hold; agents point
in via `node.humanManager`. The chart is classified **public-approved PII** (names/roles/titles are
marketed) — distinct from the standing client-PII/secrets rule, which still binds everything else.

## Consequences
- The 26 existing persona files are refactored to pure personality (ladder/scope/metrics move to
  Matrices B/C + the metrics binding); 7 employee personas are authored under `icm/employees/`; the
  knowledge agent is renamed **Alivia → Alivia**. (Companion PR, #1608.)
- New follow-on builds: the effectiveness-metric catalog + the BI aggregation layer; the app-use
  feedback loop (implicit signals + explicit user reports → tune personas/dials); the public
  promo-chart renderer; the optional DB-structured technical-limitations register.
- CI conformance should grow to verify persona ⊆ policy, persona.ceiling == org.yaml.ceiling, and
  that personas carry no Matrix-B/C content (a later gate; not in this PR).

## Considered & rejected
- **Persona as the true SoT** (regenerate policy from personas) — rejected; lets personas invent
  rules, and policy edits are restricted to two people.
- **A separate executive persona template** — rejected; one schema, execs fill the delegate-only
  structural ceiling.
- **The autonomy ladder inside the persona** — rejected; the persona is its own thing, the ladder
  is per-workflow under agent caps; bundling caused the existing drift.
- **Humans as nodes in the agent tree** — rejected; it breaks the one-root / |nodes|−1-edges
  invariant. Humans are a parallel layer; `human_manager` is a cross-link, not a tree edge.
