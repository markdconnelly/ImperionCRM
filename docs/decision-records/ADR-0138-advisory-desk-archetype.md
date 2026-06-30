---
adr: 0138
title: "Advisory desk archetype (B10) — consultable read-only Q&A workspaces"
status: accepted
date: 2026-06-29
repo: frontend
summary: "Adds a tenth ICM workflow archetype, B10 Advisory/Consultation: a read-only `archetype: advisory` workspace that FIELDS a domain question delegated by the orchestrator (Nova) and RETURNS a persona-shaped, fully-cited answer — L0, no actuation, no side effect, no send. Makes a domain agent consultable (its reasoning, not just its guardrails-as-text), with the read-only contract enforced structurally by the conformance gate + a new Constitution §10. Pilots on Chase as `domains/sales/sales-desk/`; generalizes one desk per domain agent. Extends ADR-0136; builds on ADR-0088 §9, ADR-0104, ADR-0128, ADR-0116."
tags: [agents, workflows, advisory, retrieval, doctrine]
---

# ADR-0138: Advisory desk archetype (B10) — consultable read-only Q&A workspaces

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-29 |
| **Cross-references** | ADR-0136 (workflow doctrine / archetype taxonomy) · ADR-0088 §9 (executive delegate-only tier) · ADR-0104 (grounding cortex) · ADR-0128 (autonomy ladder) · ADR-0116 (Memory MCP) · ADR-0118 (data_class / RLS) |

> Number 0138 claimed at authoring; re-confirm/renumber at merge per system CLAUDE.md §10.3,
> then `node scripts/adr-index.mjs` (regenerates README + adr-index.json; `--check` runs in CI).

## Problem

Every ICM workflow built to date is **procedure-shaped**: a fixed trigger fires a staged flow
that ends in a side effect — a send, an internal stamp, a parked proposal, a scheduled brief.
There is **no surface for an agent to FIELD a direct question.** If the orchestrator (Nova) asks
Chase *"is the Acme renewal at risk, and why?"* / *"which deals are slipping?"*, no workspace
handles it — none of his triggers is "a question arrived."

Today ad-hoc Q&A is Nova's job alone (the single-orchestrator principle): Nova holds
`search_knowledge` + the OKF grounding cortex (ADR-0104) and *can* retrieve over the sales rooms
with the agent persona as grounding. But that carries the agent's guardrails as **text**, not the
agent's **reasoning** — the qualification judgment, the "bad-fit" instinct, the deal-risk read
that is the actual expertise. Expert domain answers are unreachable, so an agent is a batch
procedure-runner, not something Nova can *consult*.

## Context

Settled inputs (not re-argued here): the **workflow doctrine** and its nine archetype
step-templates B1–B9 (ADR-0136), including A5 the evidence floor (cite-or-abstain) and A7
pool-never-bleed; the **executive tier** — Nova + 5 C-suite, delegate-only, with the
`delegate`/`handoff` capability and its return path (ADR-0088 §9, CONSTITUTION §9); the **retrieval
tier** — `knowledge.search` + `memory.recall`, granted per `room.yaml`, cited, never fabricated,
dormant until the gold vector store hydrates (CONSTITUTION §8, #1537/#389); **never-exceed-caller**
(CONSTITUTION §5.2); the **L0–L5 ladder** (ADR-0128). The decision was locked with Mark in a
`grill-with-docs` session on 2026-06-29 (the four branches below).

## Options considered

1. **Q&A stays orchestrator-only (status quo).** Nova answers every question by retrieving over
   the domain rooms + the persona-as-text. Rejected: defensible under the single-orchestrator
   principle, but it structurally loses the agent's domain-expert *reasoning* — guardrails quoted
   as text are not qualification judgment. The whole value of specialized agents is the reasoning.
2. **A new read-only advisory archetype + per-agent desks (this ADR).** A workflow shape whose
   trigger is "a domain question is delegated," which grounds, recalls, synthesizes, and **returns
   a cited answer** with no side effect. Nova stays the front door and routes; the desk supplies
   expert judgment on request.
3. **A general "query my domain" tool on every procedure.** Rejected: blurs the procedure/answer
   boundary, multiplies the actuation surface, and gives no clean place to enforce "read-only, no
   side effect." A distinct archetype with a structural contract is safer and clearer.

### Tradeoffs

A new archetype is a cross-agent surface (one desk per domain agent eventually) and a Constitution
clause — a real, hard-to-reverse addition. We accept it because the alternative (option 1) caps
the platform at "Nova reads the rooms," and because the contract is *narrowing* (read-only, L0),
so the blast radius of getting a desk wrong is bounded by construction. The desk's interactive
payoff is also substrate-gated (semantic recall + the delegate trigger are dormant), so it ships
declarative-and-dormant — accepted, same posture as the rest of the org build.

## Decision

Adopt **archetype B10 — Advisory / Consultation**, extending the ADR-0136 §B taxonomy. A workflow
declares it with `archetype: advisory` in its `agent.yaml`. The archetype:

- **Trigger** = a domain question **delegated** by Nova (or the agent's C-suite) via the §9
  `delegate`/`handoff` mechanism. One run per question.
- **Shape** = Interpret → Ground → Answer. It reads the domain's OKF rooms (`pg.read`) and attempts
  semantic recall (`knowledge.search`/`memory.recall`), then synthesizes a **persona-shaped,
  fully-cited** answer. It **returns the answer to the delegating agent** as the workflow's terminal
  output — **not a send** (returning to the delegator is internal orchestration, no ADR-0058, no
  external party), so it needs no send tool.
- **Ceiling = L0.** A desk has nothing to actuate; L0 is its ceiling, not merely its ship-dial.

**Division of labour (the keystone):** Nova answers a plain **retrieval/lookup or cross-domain**
question herself; she **delegates to a desk** only a question that needs **domain-expert judgment**.
The desk answers **Nova, never the user**.

**The contract is structural** (the §9 delegate-only precedent applied at the workflow tier).
A new **CONSTITUTION §10** states the advisory tier, and `scripts/agent-yaml-gate.mjs` enforces, for
any `archetype: advisory` workflow:

1. `autonomy_rung` MUST be `L0`; and
2. `tools ⊆ {pg.read, knowledge.search, memory.recall}` — no `send.*`, no `*.write`, no
   `booking.link`, no `delegate`/`handoff`.

The desk also explicitly binds the inherited clauses: **evidence floor / always-cite** (A5,
CONSTITUTION §8) — every claim cites its source + as-of; a fact it cannot cite it does not assert
(it says "I don't know" and routes the gap, never fabricates); **never-exceed-caller** (§5.2) — the
read scope is the asking user's; **pool-never-bleed** (A7) — internal cross-deal reasoning only, no
client's specifics in another's answer.

**Scope:** desks are for the **~21 domain agents**. The executive tier (§9) is already
advisory-by-construction (delegate-only synthesis; its pulse/brief tracers are advisory output) and
Nova is the asker — neither carries a desk. Rollout = one `<domain>-desk` per domain agent, mirroring
the #1538 sweep; the **pilot is `domains/sales/sales-desk/`** (Chase), shipped with a cite-or-refuse
eval golden.

## Consequences

ADR-0136's §B taxonomy gains B10 (a pointer entry; the full template is here). `CONTEXT.md` gains the
"Advisory Desk" term. The conformance gate gains the `checkAdvisoryArchetype` check (+ unit tests).
The `agent.schema.json` gains an optional `archetype` enum. The sales-desk pilot is authored against
the contract and ships **dormant**: the delegate trigger rides the executive intake mechanism (Nova
`intake-route` #1673 / division-intake #1680, in flight) and semantic recall is dormant until
#1537/#389 hydrate — until then a desk answers from `pg.read` + persona reasoning, treats an empty
recall as absence of memory (A5c), and the per-agent rollout stays under #1677.

### Security impact

Positive and bounded. The read-only contract is **machine-enforced**, not stylistic: an advisory
workspace structurally cannot send, write, book, or delegate. never-exceed-caller (§5.2) and
pool-never-bleed (A7) are bound into the archetype so a consultation cannot become a cross-client
data-bleed or a privilege-escalation read. The always-cite floor makes every answer auditable to its
source. No new tool, no new data-class, no widened budget — the desk grants a strict subset of the
existing read-only retrieval set.

### Cost impact

Negligible build cost (docs + a small gate check). Runtime: a consultation is a few grounded reads +
a synthesis — cheaper than a procedure run; no external round-trip.

### Operational impact

Turns each domain agent from a batch-procedure-runner into something Nova can *consult* — the
highest-leverage step toward a usable orchestrator. Adds one workspace per domain agent over time
(the rollout), each conformance-checked the same way. Until the delegate trigger + retrieval substrate
land, desks are dormant; they do not change any live behavior.

## Future considerations

The per-agent rollout (#1677); whether a desk should ever be allowed a narrow, dial-gated *propose*
(it deliberately cannot today — the archetype is pure-read by design); how a consultation answer is
surfaced in the GUI (the `/jarvis` console / operator surfaces); whether executive "desks" are ever
warranted once the C-suite synthesis tracers are exercised in anger.
