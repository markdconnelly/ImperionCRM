---
adr: NNNN
title: "Policy canon architecture — a single dual-audience policy set governing humans and agents alike, in three categories"
status: proposed
date: 2026-06-28
repo: frontend
summary: "Establish ONE policy canon under icm/policies/ that governs the hybrid human+agent workforce uniformly: every policy is a single document read the same way by a human and by an AI agent (plain-language rules + an explicit 'Application to autonomous agents' section). Organized in three CATEGORIES (Cybersecurity / Information Technology / Business Operations) and three TIERS (umbrella / distinct / procedure-specific), under one top-level umbrella (Imperion Operating Policy & Code of Conduct) that carries the dual-actor model and the cross-cutting autonomy/oversight framework (ladder/dial/gauntlet/always_gate/oversight/pool/no-fabrication), referencing ADR-0128/0109/0058 rather than restating them. Rejects a separate agent-governance policy series (agent behavior lives inside each policy) and a by-governance-type split (IM/AG/OP). The merged IM001-026 info-sec set is re-sorted into Cybersecurity (most) and Information Technology (patch/change/backup/device/account-lifecycle/network) and rewritten dual-audience. Binding is two-layer (a universal baseline every procedure inherits + 1-3 named per-procedure drivers); a coverage-matrix proves every Operating Procedure/step is governed. This is the D4 driving-policy layer of the Operating Procedure catalog (ADR for the catalog: companion)."
tags: [governance, agents, policy]
---

# ADR-NNNN: Policy canon architecture — one dual-audience set governing humans and agents

> Number claimed at MERGE per system CLAUDE.md §10.3. Authored against the placeholder `NNNN`;
> the next free number is taken at merge (current max 0132; the Operating Procedure catalog ADR
> is a sibling placeholder claiming around the same time — sequence at merge), the file is
> renamed, and every `ADR-NNNN` reference in icm/policies/ + CONTEXT.md is fixed.

| Field | Value |
|---|---|
| **Repo** | frontend (owns `icm/`, the schema, the OKF bundle, and the docs tree) |
| **Status** | Proposed |
| **Date** | 2026-06-28 |
| **Cross-references** | [ADR-0128](ADR-0128-canonical-agent-autonomy-ladder.md) (autonomy ladder), [ADR-0109](ADR-0109-actuation-autonomy-dial.md) (dial + hard ceilings), [ADR-0058](ADR-0058-composer-sends-via-approval-gated-backend-path.md) (gauntlet), [ADR-0118](ADR-0118-data-class-third-rls-axis-action-ceiling.md) (data-class ceiling), [ADR-0131](ADR-0131-executive-suite-tier.md) (the org governed), [ADR-0086](ADR-0086-okf-semantic-layer-over-silver.md) (one-canon doctrine precedent) |
| **Companion** | the Operating Procedure catalog ADR (placeholder, #1581) — this ADR is its D4 driving-policy layer |

## Problem

Imperion runs on a hybrid workforce — human employees and a roster of 26 AI agents (ADR-0131).
Both need to be governed, but governance was fragmented and incomplete:

- **Three disconnected homes.** Info-sec policy lived in `icm/policies/` (IM001-026, #1587);
  one business policy lived in `docs/policies/` (expense, #493); agent governance lived only as
  ADRs (0128/0109/0058) and `docs/agents/` docs — never as a citable *policy*.
- **No policy governs agents as actors.** The IM set governs humans (and Copilot/client AI),
  not Imperion's own autonomous agents acting on the business.
- **"Policy" was undefined** in CONTEXT.md, and the catalog's D4 `Driving policy` field had
  nothing real to point at — every one of ~174 procedures read `TBD`.

We need one coherent, complete policy canon that a human and an agent read the same way, that
covers every category of work, and that binds every Operating Procedure.

## Context

- Mark's directive: *a single set of policies, human-readable, addressing both human and agent
  behavior, applying to all procedures/steps they govern; split into Cybersecurity, Information
  Technology, Business Operations; including umbrella, distinct, and procedure-specific policies.*
- The project's standing doctrine is **one canon, zero drift** (OKF §11, skills §9).
- The autonomy framework already exists as architecture (ADR-0128/0109/0058); a policy is a
  different artifact — a binding, owned, auditable rule statement — that *references* the ADR.

## Options considered

### Option A — Three series by governance-type (IM info-sec / AG agent-gov / OP operational)
Author a separate agent-governance (AG) series alongside info-sec and operational series.
**Rejected (by Mark).** It splits human and agent governance into different documents, when the
goal is one document both audiences read. It also makes "what governs this agent" a scavenger
hunt across series.

### Option B — Keep agent governance as ADRs only
Procedures cite ADRs for agent behavior and policies for everything else.
**Rejected.** An ADR records *why*; it is not an owned, reviewed, auditable rule an auditor or a
new hire reads as "how we operate." Agent governance must be policy.

### Option C — One dual-audience canon in three categories (chosen)
A single set under `icm/policies/`, three categories (Cybersecurity / IT / Business Operations),
three tiers (umbrella / distinct / procedure-specific), one top umbrella carrying the dual-actor
model + autonomy framework. Every policy is one document with an *Application to autonomous
agents* section.

### Tradeoffs
Option C requires re-sorting and rewriting the just-merged IM set into the category structure
(churn) and disciplined dual-audience authoring. In exchange: one home, one read for both
audiences, provable coverage, and agent governance that is first-class policy. The re-sort is
cheap now because the catalog's `Driving policy` fields are still `TBD` (no references to break).

## Decision

1. **One canon, `icm/policies/`.** Define **Policy** as a canonical term (CONTEXT.md): a
   binding rule-set, read identically by humans and agents, that an Operating Procedure cites in
   its `Driving policy` field.
2. **Three categories:** Cybersecurity (`CS-NN`), Information Technology (`IT-NN`), Business
   Operations (`BO-NN`), each a subfolder with a category umbrella.
3. **Three tiers:** umbrella (broad, per category) · distinct (topic) · procedure-specific
   (governs one Operating Procedure).
4. **Top umbrella** (`00-imperion-operating-policy-and-code-of-conduct.md`) above all three:
   the dual-actor model + the cross-cutting autonomy/oversight framework (ladder, dial,
   gauntlet, `always_gate`, human-in-loop/easy-button, escalation/notification P1–P4, the pool
   principle, no-fabrication) + the D4 binding model. References the ADRs; restates none.
5. **Dual-audience template** (`_TEMPLATE.md`): metadata (category/tier/human-owner/governing-
   agents) + Purpose · Scope · Definitions · Policy Statements (actor-neutral) · **Application
   to autonomous agents** (ceiling, `always_gate`, easy-button, escalation, evidence) · Roles
   (human + agent in one table) · Enforcement & Audit · Framework Alignment · Related.
6. **Re-sort IM001-026** into Cybersecurity (most) + Information Technology (patch, change/
   config, backup/BCDR, device baseline, account lifecycle, network termination), rewritten
   dual-audience; the Enterprise program → CS-00; the IR program → CS-IR. Migrate
   `docs/policies/expense-policy.md` (#493) → BO-07.
7. **Two-layer binding (D4):** a universal baseline (top umbrella + cross-cutting policies) is
   inherited by every procedure and not restated; each procedure names its 1–3 specific drivers.
8. **Coverage proof:** `icm/policies/coverage-matrix.md` maps every Operating Procedure → its
   driving policy(ies) and every policy → procedures governed. A CI gate (fail on a `TBD`
   driving policy) is deferred until the catalog mapping completes.

## Consequences

### Security impact
Agent behavior becomes first-class, auditable policy: every governed agent action has a named
authorizing policy with an autonomy ceiling and `always_gate` floor, readable by an auditor.
The pool principle (correlate-never-bleed), no-fabrication, and least-privilege are codified for
both audiences. Policies carry no secrets, PII, or client data (they reference data classes).

### Cost impact
Documentation only — no schema, no migration, no runtime cost.

### Operational impact
One home and one read for the whole workforce; the catalog's D4 layer gets a real target; the
coverage-matrix becomes the completeness artifact for "is every procedure governed?". The
standing discipline: a new Operating Procedure or a changed agent capability updates the
governing policy + the matrix in the same change set.

## Future considerations
- Map the ~174 catalog `Driving policy` fields from `TBD` → the canon (follow-up, after the
  catalog outline #1581 merges and the distinct policies exist).
- Procedure-specific tier filled where a procedure needs rules beyond its distinct policy.
- A CI coverage gate once mapping completes (extends the docs/semantic-layer gate pattern).
- Per-client policy derivation from the masters (the IM set already anticipates this; CS-18
  Client Shared Responsibility is the starting point).
