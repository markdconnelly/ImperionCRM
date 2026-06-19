---
adr: 0104
title: "OKF as the orchestrator grounding cortex — routing keys, deterministic load, enforced freshness"
status: proposed
date: 2026-06-18
repo: frontend
summary: "How the OKF semantic bundle serves the single orchestrator: grounding-only scope, source-scoped tool pointers, deterministic Layer-3 load, two routing frontmatter keys, and freshness as a correctness control."
tags: [meta]
---
# ADR-0104: OKF as the orchestrator grounding cortex

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-18 |
| **Amends** | [ADR-0086](ADR-0086-okf-semantic-layer-over-silver.md) (OKF semantic layer over silver) |
| **Cross-references** | ADR-0004 (single-orchestrator agent model) · ADR-0061 (ICM business-process automation) · ADR-0086 (OKF semantic layer) · ADR-0103 (connection credential registry) · ADR-0041 (vector contract) · ADR-0091 (agent & ICM platform) · CLAUDE.md §8 (read-only DB MCP / PII), §9 (skills canon), §10.3 (claim-at-merge), §11 (OKF cross-repo contract) · [data-and-automation-doctrine.md](../architecture/data-and-automation-doctrine.md) |

## Problem

ADR-0086 established *that* the OKF bundle exists and *what* it may contain
(meaning, authority, joins; PII-free, code-free). It did **not** specify how the
**single orchestrator** (ADR-0004) actually *uses* the bundle to have the right
context when it performs a task — "faithfully, with consistency." Without that, the
bundle is an excellent dev-time reference that is **inert at think-time**:

- The bundle is markdown in git. The doctrine's own roadmap (vectorize into gold,
  LocalPipeline #176, blocked on expansion #536) means OKF is **not in any runtime
  retrieval path today**.
- It is unclear whether the orchestrator may use OKF to *route to a tool/skill*, or
  only to *ground on meaning*. The format forbids code knowledge, but "which
  sanctioned skill talks to source X" is a real routing need.
- There is no contract for **how** a concept reaches the agent (RAG vs deterministic
  load), and the two mechanisms have opposite consistency properties.
- The freshness machinery (ADR-0086 constraint 3 / the #535 gate) was framed as
  *docs hygiene*. Once the orchestrator deterministically grounds on the authority
  rule, a stale rule **silently corrupts every action** — freshness becomes a
  **correctness control**, and the most dangerous staleness (a merge-precedence flip)
  leaves **no schema fingerprint** for the #535 gate to catch.

This ADR records six decisions settled in a 2026-06-18 design session that turn the
OKF bundle into the orchestrator's reliable grounding cortex.

## Context

The "brain" the orchestrator needs is the *fusion* of five organs, only one of which
is OKF:

| Organ | Question it answers | Where it lives |
|---|---|---|
| **Trust** | can I rely on this data? | medallion (bronze→silver→gold) |
| **Understanding** | what does it mean / which source wins / how does it join? | **OKF / IKF** |
| **Facts** | what is *this client's* actual value? | live read-only DB (CLAUDE.md §8) |
| **Memory** | what happened before? | `agent_run` / `agent_message` / agent memory |
| **Action** | how do I do it, gated and audited? | ICM (ADR-0061) + autonomy dial |

OKF is the **understanding** organ. Asking "is OKF the brain" is a category error;
the answerable question is "is OKF a sufficient *grounding substrate* for a brain
assembled from all five." The doctrine's design DNA — **"human-readable =
machine-readable; no translation layer to drift"** — is the lens that decides every
sub-question below.

## Options considered

For each decision the rejected alternative and the reason are recorded under
**Decision**. The cross-cutting alternative — *do nothing, leave ADR-0086 as the
whole story* — is rejected because it leaves the bundle inert at think-time and
leaves freshness mis-framed as hygiene rather than correctness.

### Tradeoffs

The decisions trade a little authoring/CI machinery for two guarantees the
orchestrator needs: **consistency** (the authority rule is always in context before
an action) and **non-lying** (a behavioural change cannot silently outdate the rule).
The main cost is the cross-repo freshness leg (sibling CI + a reconciliation agent),
accepted because the no-DDL precedence flip is otherwise undetectable until something
breaks in production.

## Decision

**1. Scope — OKF stays grounding-only.** OKF answers *meaning / authority / joins*.
Tool/action *selection* is not OKF's job — it belongs to ICM stage contracts,
`agent_tool_grant`, and `coverage-matrix.md` (object → acting ICM workflow). OKF may
*point at* an actor (a tolerated authority pointer per AUTHORING.md) but never
*describes* a tool. *Rejected:* making OKF a tool index — violates ADR-0086
constraint 4 and duplicates the coverage matrix.

**2. Tool pointer granularity — source-scoped, once.** The map from a source system
to its **sanctioned fetch/validate skill** lives **once** in the source registry
(the `connection` provider record / a sibling config table, extending
[ADR-0103](ADR-0103-connection-credential-registry.md)) — **not** duplicated into
each entity concept file. An entity file already lists its sources; the orchestrator
resolves *entity → its sources → registry → sanctioned skill* in one hop. *Rejected:*
a per-entity skill pointer — the same skill (e.g. Autotask fetch) serves ~15
entities, so per-entity pointers are N× duplication and N× independent drift (the
"N shallow adapters → one deep module + config table" anti-pattern).

**3. Delivery — deterministic Layer-3 load is the spine; RAG is for discovery.** When
an ICM stage knows the entity (it almost always does), it loads that one concept file
**whole**, deterministically, as a Layer-3 constraint — guaranteeing the authority
rule is in context every time, cheaply (~60 lines), auditably. Vectorized-OKF RAG
(ADR-0041 contract, LP #176) is reserved for *discovery* — when the agent does not
yet know which entity matters. *Rejected:* RAG-first grounding — chunking can return
the schema table but drop the authority section, producing silent inconsistency.

**4. Schema — two routing keys; the rule stays prose.** Add two frontmatter keys to
every concept file: `entity` (the addressable silver/gold name) and `archetype` (one
of the eight doctrine archetypes, `A`–`H`). These are **classification labels** that
make *routing* (which file to load, how it behaves) deterministic — they are **not**
a second copy of the authority rule, so they create no drift surface. The authority
rule itself **stays prose**, read natively by the LLM consumer. *Rejected:* a
structured `authority: {precedence: [...]}` block — it manufactures exactly the
translation-layer drift the doctrine designs against ("human-readable =
machine-readable"); pre-structuring is a pre-LLM-era reflex when the consumer is a
language model.

**5. Use enforcement — stage Inputs must list the concept file.** Any ICM stage that
reasons over entity E must list E's concept file in its Layer-2 **Inputs** table. The
stage contract then cannot run without the authority rule in context, and the audit
trail proves it was present. This is the mechanical "faithfully" guarantee. (Convention
recorded here; wiring is a follow-up issue.)

**6. Freshness is a correctness control — three defence layers.** Because
deterministic grounding makes a stale rule actively wrong, freshness is enforced in
depth, strongest where cheapest:

- **Same-repo gate (extend #535):** fire on (a) silver DDL *and* (b) changes to the
  source→skill registry / a referenced skill — all in this repo, all diffable today.
- **Cross-repo CI link-check (new):** a sibling-repo PR touching merge / ingestion /
  precedence for a silver entity must link an `okf-sync`-labelled issue/PR in this
  repo, else the sibling's CI fails. **This is the only mechanical catch for the
  no-DDL precedence flip.**
- **Reconciliation backstop (LP #175):** the enrichment agent periodically diffs
  live behaviour against the prose authority rule and opens drift issues — catches
  whatever slips both gates.

This supersedes the framing in ADR-0086 §"Operational impact" that the gate is
primarily docs hygiene: the same-repo gate is necessary but **not sufficient**; the
cross-repo leg is required.

## Consequences

### Security impact

Net-positive and boundary-preserving. Decisions 1–4 keep OKF inside the ADR-0086
PII-free / code-free boundary (the routing keys are labels, not data; the skill
pointer is a name in the registry, not a secret — secrets remain Key-Vault-by-ref per
ADR-0103). Decision 6 *strengthens* security: a merge-precedence flip silently
trusted by the orchestrator is a data-integrity risk, and the cross-repo gate closes
it. The PII boundary remains load-bearing: deterministic load carries only the
PII-free concept file; specific values still resolve against the live DB (§8).

### Cost impact

Negligible. Two frontmatter keys and prose authority add no embedding cost. The
same-repo gate extension is a script change. The cross-repo link-check is CI config
in each sibling. The reconciliation agent (LP #175) rides existing on-prem budget.

### Operational impact

- **Frontmatter backfill** of `entity` + `archetype` across the ~50 existing concept
  files — a follow-up batch (one micro-PR per batch), not this PR.
- **Source→skill registry** column/table extending ADR-0103 — follow-up (schema +
  concept-file update for `connection`).
- **Sibling CI link-check** + `okf-sync` label provisioning across Pipeline /
  LocalPipeline — follow-up, coordinated via §11.
- **Stage-Inputs enforcement** wired into the ICM `CONVENTIONS.md` / Layer-2 lint —
  follow-up.
- **#535 gate extension** to skills/registry — follow-up.
- The single most important ICM/orchestrator habit becomes: *ground on the entity's
  concept file before acting; the authority rule is never optional.*

## Future considerations

- Once OKF is vectorized into gold (LP #176), keep the deterministic spine primary;
  RAG augments, never replaces, grounding.
- If a real machine-extraction miss on a prose authority rule is ever observed,
  revisit decision 4 — but only with evidence, and prefer a tighter prose
  convention over a structured block.
- A concept-file → acting-workflow round-trip check (decision 1's pointer integrity)
  could later be added to the reconciliation agent.

## Coverage state and sequenced expansion plan

This ADR makes coverage a **correctness** concern, not just a completeness one:
deterministic Layer-3 grounding only works on a concept-bearing (✅) entity, so an
uncovered entity the orchestrator must act on cannot be grounded at all. As of
2026-06-18 the bundle is **~46 ✅ of ~110+ objects** (coverage-matrix.md): the
high-value silver A/B/C/E entities are mostly covered; the gaps below are now
prioritised by *what the brain needs to act faithfully*, not by domain order. The
expansion track is [#536](https://github.com/markdconnelly/ImperionCRM/issues/536);
each tier is one micro-PR per batch following AUTHORING.md.

**Tier 1 — act-path prerequisites (do first).** The orchestrator grounds *then acts*;
these are the entities it acts *on/through*:
- **D-archetype write-back sidecars** — `project_provisioning`, `task_ticket_fire`,
  `time_ticket`, `autotask_expense_report`, `collections_activity`,
  `defender_incident_ticket_link`. (The autonomy dial executes here; ungrounded =
  unsafe to dial up.)
- **`agent_tool_grant`** (+ `agent`, `agent_settings`) — decision 1 names
  `agent_tool_grant` as the tool-routing authority, yet it has no concept file. The
  registry table from decision 2 (extends ADR-0103) lands as its own concept update
  to `connection`.

**Tier 2 — MSSP depth.** `posture_policy` + the `*_golden` policy tables
(CA / Intune / Autopilot / device-config / Defender XDR — the drift engine);
`defender_incidents` / `defender_alerts`.

**Tier 3 — completeness.** Marketing leaves (`ad`, `audience`, `event`, `lead_hook`,
`social_metric`); reconciliation views (`expense_reconciliation`, …); reference/config
(`connector_instance`, `account_tenant`, `saved_view`, `report_definition` / `dashboard`,
`project_type`, comp tables).

**Matrix-drift fixed in this PR:** `ci_relationship` and `cmdb_ci_overlay` already have
at-bar concept files under `tables/` but `coverage-matrix.md` still marked them ⏳ —
flipped to ✅ here.

## Follow-up issues (to file on merge)

- Backfill `entity` + `archetype` frontmatter across the ~46 existing files (batched).
- Source→sanctioned-skill registry extending ADR-0103 (schema + `connection` concept update).
- Extend the #535 gate to skills/registry changes.
- Sibling-repo `okf-sync` CI link-check (Pipeline / LocalPipeline) + label.
- ICM stage-Inputs-must-list-concept enforcement (CONVENTIONS + lint).
- LocalPipeline #175 reconciliation: diff live merge/ingestion behaviour vs prose authority.
- Tier-1/2/3 concept-file expansion under #536, sequenced as above.
