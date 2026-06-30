---
adr: 0123
title: "Agent-first plumbing, human-first operation, graduated autonomy (v1 build doctrine)"
status: proposed
date: 2026-06-24
repo: frontend
summary: "Every v1 workflow is engineered as if an agent already ran it live — the agentic/OS plumbing (governed routine + action-catalog entry + grounding + gauntlet/governance hooks + OKF concept refs + agent instruction set + beneficial skills + company knowledge-layer entries + design notes) is designed and wired as part of the feature — but is OPERATED by a human first through a friction-removing GUI and must be human-verified before any agent touches it. Build order is three layers: L1 clean data → L2 GUI+routines (human-operated) → L3 the eight-agent roster lights up the SAME routines. Agents earn per-workflow autonomy only as trust is established (ADR-0121). No workflow is built GUI-only or agent-only. v1.0.0 = every workflow human-verified + eval gate (#186) + Mark sign-off."
tags: [meta, agents, architecture]
---

# ADR-0123: Agent-first plumbing, human-first operation, graduated autonomy (v1 build doctrine)

> Number claimed at MERGE per system CLAUDE.md §10.3 / [ADR-0084](./ADR-0084-merge-time-number-assignment.md).
> `0123` is a placeholder — the branch that merges second renumbers to the next free
> slot and fixes every reference. This is a docs-only ADR; it claims no migration number.

| Field | Value |
|---|---|
| **Repo** | frontend (this doctrine is cross-repo; authored here because the front end owns the schema + the docs hub, ADR-0042) |
| **Status** | Proposed |
| **Date** | 2026-06-24 |
| **Issue** | #1301 |
| **Cross-references** | ADR-0057 (v1-complete recut — "the complete product, every feature fully working"), ADR-0055 (autonomy tiers T0–T3), ADR-0107 (governed action / tool-grant plane), ADR-0109 (1–5 actuation dial + cockpit), ADR-0121 (earned / graduated autonomy + hard ceilings), ADR-0118 (data_class action ceiling + always_gate), ADR-0087 (orchestration & observability matrix), ADR-0086 / ADR-0104 (OKF semantic layer + grounding cortex), ADR-0060 (skills canon), ADR-0114 / ADR-0116 (knowledge tiers + Memory MCP) |

## Problem

v1 is "the complete product, every feature fully working" (ADR-0057) — and as of
2026-06-24 that bar is **sharpened**: "fully working" means **verified end-to-end against
real prod data and human-gated**, not merely code-merged. Mark's people do most of these
workflows **manually** today.

There was no recorded doctrine for **how** to build each feature so that, together, two
things hold:

1. the human's manual work is made **frictionless first** — the GUI removes toil from the
   person who does the job today; and
2. the agent that will **later** automate that same work is **designed in from the start**,
   not retrofitted.

Without a written doctrine, teams drift to one of two failure modes: they ship **GUI-only**
features that an agent can never drive (no governed routine, no action-catalog entry, no
grounding), or they build **agent paths over workflows no human has validated** — automating
on top of data and steps nobody trusts. Both are dead ends this ADR forecloses.

## Context

The pieces this doctrine ties together already exist as decisions; what was missing is the
**ordering and build-loop contract** that makes every feature land all of them at once.

- **The three governance planes are settled.** The governed action / tool-grant plane
  (ADR-0107), the operator 1–5 actuation dial + cockpit (ADR-0109), earned / graduated
  autonomy with hard ceilings (ADR-0121), the `data_class` action ceiling + always-gate set
  (ADR-0118), and the orchestration & observability matrix (ADR-0087) are all in place. They
  describe **how** an agent is allowed to act — this ADR says **when** that plumbing is built
  (answer: as part of every feature, from step one).
- **The grounding + knowledge surfaces are settled.** The OKF semantic layer and grounding
  cortex (ADR-0086 / ADR-0104), the skills canon (ADR-0060), and the knowledge tiers +
  Memory MCP (ADR-0114 / ADR-0116) give an agent its meaning, its skills, and its
  second-brain. A workflow's agent end-state is incomplete unless these are wired with it.
- **The eight-agent roster is ALL v1.** Felix (Service), Audrey (Finance), Chase (Sales),
  Belle (Marketing), Vance (Procurement), Pierce (Projects), Celeste (Client Success / vCIO),
  and Vera (Platform / Governance) are the agents that will eventually light up these
  workflows. They are not a post-v1 add-on; they are the L3 of the build.
- **Finance is READ-ONLY in Imperion.** QuickBooks Online is the system of record for finance
  **actions**. There is no money-moving agent — Audrey reads and proposes, money moves stay in
  QBO under a human. This is a standing containment fact, not a per-workflow choice.
  > **Amended by ADR-0139 (finance autonomy, #1740).** This clause is *sharpened*: the invariant
  > is **no MONEY action**, not **no action**. QBO/money stays the permanent dial-proof
  > `always_gate` wall (no agent writes QBO or moves money), but the app-native processes *around*
  > QBO are automatable with **explicit per-workflow** human-in-the-loop — finance does NOT inherit
  > the canonical ladder (ADR-0128 D5). See the finance-autonomy ADR for D1–D4. (ADR number claimed
  > at merge, §10.3.)
- **The agent loop is essentially unexercised in prod today** (`agent_run` ≈ 2). That is the
  whole reason for human-first operation: trust in the agent path has to be **earned against
  real traffic**, starting from zero.
- **Discovery is expected.** Surfaces this doctrine implies — e.g. Teams Adaptive Cards for
  human-approval workflows — are **not built yet** but will be before v1; each is grilled when
  the workflow that needs it is reached, and filed as a normal issue folded into that
  workflow's slice.

## Decision

### D1 — Three layers, built in order, with the agent end-state designed in from step 1
v1 is built as three layers, **in this order**:

- **L1 — Data.** The data plane is clean, correct, and entity-resolved (medallion
  bronze→silver→gold, the OKF semantic layer as the type system). Nothing built above it is
  trustworthy until L1 is.
- **L2 — GUI + routines (human-operated).** Every workflow is **human-operable** through a
  friction-removing GUI, backed by a governed routine.
- **L3 — Agents.** The eight-agent roster lights up the **same** routines L2 already runs.

AI is the **last** layer **specifically because** the data must be trustworthy and the human
experience fixed before agents act. This is the inverse of "build the AI, then find data for
it."

### D2 — The standing per-workflow build loop
Every workflow follows the same five-step loop:

1. **Grill-with-docs** — define the manual human steps and sharpen the terms, updating
   `CONTEXT.md` / OKF concept files inline as decisions crystallise.
2. **Build the friction-removing GUI** for the human path.
3. **Capture + wire the AGENT-PREP BUNDLE** (D3) in the **same design** — wired but dormant.
4. **Human-verify** (D4).
5. **[Phase 3] Light it up** (D5) — the owning agent runs the routine under supervision and
   earns autonomy.

### D3 — The agent-prep bundle (what "capture the agent's intelligence / plumbing" means)
For every workflow, the same design that ships the human GUI also designs and wires —
**wired-but-dormant** — the full agent end-state:

- **One governed ROUTINE with two front-ends** — a human GUI trigger (live now) and an agent
  trigger via the gauntlet (later). One routine, never two parallel code paths.
- **Its action-catalog entry** (ADR-0107).
- **The grounding it needs** — OKF concept references (ADR-0086 / ADR-0104).
- **Governance hooks** — the `data_class` ceiling (ADR-0118), the actuation dial (ADR-0109),
  earned autonomy (ADR-0121).
- **The owning agent's INSTRUCTION SET** — persona + guardrails.
- **Any beneficial SKILLS** (ADR-0060).
- **The COMPANY KNOWLEDGE-LAYER entries** — the file-system second-brain canon / company
  tiers (ADR-0114 / ADR-0116).
- **Design notes** for the eventual automation.

**No workflow ships GUI-only or agent-only.** The bundle is part of the feature's definition
of done, not a follow-up.

### D4 — Human-first operation + the human-verified gate
Each workflow is **operated by a human first**. It is not "done" until it is **verified
end-to-end against real prod data AND human-gated** — Mark's UX sign-off (#186) plus user
testing — signalled by a `human-verified` label on a per-repo v1-live-verification ledger
line. **No agent is enabled on a workflow before its routine is human-verified.**

### D5 — Graduated autonomy, per workflow
Once a workflow is human-verified, the owning agent runs its routine **SUPERVISED**, then
earns higher autonomy **per workflow** only as trust accrues — under the earned-autonomy
state machine and the hard ceilings (ADR-0121 / ADR-0118). **Which** actions an agent
automates is decided **per-workflow during that workflow's design**, not all up front, and
never above the always-gate hard ceiling.

### D6 — v1.0.0 definition
**v1.0.0 (first employee use)** is declared when:

- every v1-live-verification ledger line is `human-verified`,
- the eval gate (#186) passes, and
- Mark signs off.

Discovery work surfaced while grilling a workflow (e.g. the Teams Adaptive Card
human-approval surface) is filed as a **normal issue** and folded into that workflow's slice
— never deferred silently, never a TODO.

## Options considered

1. **Agent-first plumbing + human-first operation + graduated autonomy (chosen).** Build the
   data first, then a friction-removing human GUI, and wire the full agent end-state into the
   same design as a dormant bundle; operate by human, verify against prod, then let the agent
   earn autonomy per workflow.
2. **Ship the GUI now, bolt agents on later (rejected).**
3. **Build agents first / agent-only (rejected).**
4. **Big-bang full spec up front (rejected).**

### Tradeoffs

- **(1) chosen** — Pro: one routine drives both front-ends, so there is **zero retrofit** and
  no second code path to keep in sync; the human gets value immediately; the agent inherits a
  human-validated workflow + grounding + governance the day it switches on. Con: more up-front
  design time per workflow (the grilling + the bundle) — accepted, because it is repaid the
  first time an agent has to drive the feature.
- **(2) ship GUI now, bolt agents on later** — Rejected: the retrofit cost is real; an agent
  **cannot drive a GUI-only feature** (no governed routine, no action catalog, no grounding);
  and you end up with two divergent paths (human GUI vs. a later agent shim) instead of one
  routine.
- **(3) build agents first / agent-only** — Rejected: it acts on **unvalidated data and
  workflows no human trusts**, which is exactly the `agent_run` ≈ 2 risk — turning automation
  loose before any human has confirmed the path is correct.
- **(4) big-bang full spec up front** — Rejected: **discovery is real** (e.g. the Teams
  Adaptive Card surface is not built yet); each workflow needs its **own** grilling, so a
  single monolithic spec would be wrong on contact and block all parallel streams.

## Consequences

The doctrine becomes the standing build contract for every v1 feature across the four repos:
each feature is a grill + GUI + agent-prep bundle + human-verify, tracked to v1.0.0 on the
per-repo verification ledgers. One routine — not two paths — is the through-line.

### Security impact

The **human-verified gate** plus the **always-gate hard ceilings** (ADR-0118 / ADR-0121) mean
money / credentials / customer-facing actions **never auto-cross a Mark-gate** — no agent
track record can promote past them. **Finance stays read-only** in Imperion and **QBO is the
system of record** for money movement, so there is no money-moving agent path to secure. No
agent runs on any workflow until that workflow's routine is human-verified, so automation
never acts on an unvalidated path.

### Cost impact

Per-workflow grilling is **more up-front design time**. It is repaid by (a) **no retrofit**
cost when the agent layer lights up, and (b) maintaining **one routine** instead of two
parallel human/agent paths.

### Operational impact

Each workflow becomes a repeatable unit: **one grill + GUI + agent-prep + human-verify**. The
per-repo v1-live-verification ledgers track the road to v1.0.0. Expect **many grill-with-docs
sessions** — the design cost is front-loaded by design.

## Future considerations

The **supervised → autonomous** promotion happens **post-v1** under ADR-0121 (earned autonomy
+ hard ceilings) — v1 ships agents supervised, autonomy is earned afterward against real
traffic. **v2** picks up the deferred board features (dispatch, auto-remediation, the Pax8
license loop) on top of the now-trusted routines and data.
