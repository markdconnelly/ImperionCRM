---
adr: 0119
title: "Grounding-conflict resolution workflow + domain-owner registry"
status: proposed
date: 2026-06-22
repo: frontend
summary: "When the three knowledge tiers — canon/OKF, company silver, and the caller's personal tier — disagree at grounding time, the conflict is NOT resolved by hard precedence and NOT by model arbitration. It is bubbled to the DOMAIN BUSINESS OWNER (a per-concept/domain registry) to resolve via a workflow — the company-tier twin of the #968/ADR-0114 contradiction state machine. The agent does not stall: it answers immediately with the most-authoritative VALID tier (canon > company_silver > personal, gated by temporal validity), LABELLED, and raises the conflict in parallel (hedge/refuse-until-resolved is rejected as the default). Every conflict + resolution is ledgered. Resolution write-back to canon/silver is the deferred follow-up."
tags: [meta, agents, knowledge-tiers]
---

# ADR-0119: Grounding-conflict resolution workflow + domain-owner registry

> **Number is a placeholder.** ADR-0119 is claimed at MERGE per system CLAUDE.md §10.3 — the
> branch that merges second renumbers. The migration is authored as
> `0178_grounding_conflict_domain_owner.sql` against a placeholder number likewise.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + this ADR + the grounding decision helper); backend owns the resolution write-back runtime |
| **Status** | Proposed |
| **Date** | 2026-06-22 |
| **Issue** | #1035 (parent #1033) |
| **Cross-references** | ADR-0086 (OKF semantic layer — canon tier), ADR-0114 / #968 (personal knowledge store + the `personal_contradiction` state machine this generalizes), ADR-0105 (two-axis RLS access spine), ADR-0118 (data_class third axis — the MSP isolation axis), ADR-0042 (four-repo split), agentic-OS design contract (2026-06-21, **decision 4** — grounding conflicts → owner resolution), epic #966 (tiered knowledge) |

## Problem

At grounding time the orchestrator (Jarvis) draws on three knowledge tiers (#966 / ADR-0114):

- **canon / OKF** — the curated meaning layer (ADR-0086): definitions, source-of-record, authority
  rules. The most authoritative.
- **company silver** — the merged silver tier: the company's normalized facts.
- **personal** — the caller's personal tier (ADR-0114 temporal-KG facts, with validity windows).

Sometimes they **disagree** about the same concept — canon says one thing, the merged silver row
says another, the user's personal memory a third. Two non-answers tempt us:

1. **Hard precedence** — always trust canon, then silver, then personal. Cheap, but wrong: a stale
   canon entry would silently override a fresh, correct personal fact, and the *system of record*
   would never get corrected — the disagreement just gets buried every time.
2. **Model arbitration** — let the LLM decide who's right. Unaccountable and non-deterministic; the
   wrong call is invisible and unauditable.

Neither corrects the underlying data, and neither has an owner. The agentic-OS contract
(2026-06-21, decision 4) settled the answer: **bubble the conflict to the domain business owner to
resolve**, reusing the contradiction state machine #968 already built for the personal tier
(`personal_contradiction`), generalized one tier up to company scope.

But a workflow takes time, and an agent that **stalls** ("I can't answer — there's a conflict") is
useless. So the contract also fixes the **interim behavior**.

## Decision

### 1. Conflict model — bubble to the domain owner (extend #968, don't fork it)

A grounding-time disagreement between two or more tiers becomes a **`grounding_conflict`** row — the
company-tier twin of `personal_contradiction` (ADR-0114 / migration 0169). Same posture:

- **Never auto-resolved.** A human (the domain owner) decides. Not precedence, not the model.
- **State machine**: `open → resolved | dismissed` (mirrors `personal_contradiction`'s
  `open → approved | dismissed`; named for the company semantics — `resolved` affirms a tier as
  correct, `dismissed` rejects the conflict as spurious).
- **Routed by domain.** Each conflict carries a `domain`; the **`domain_owner` registry** maps
  domain → the resolving business owner. A `fallback_role_slug` routes domains with no named owner
  (or while an owner is out) to a role (`app.groups` slug, ADR-0105) so nothing stalls unrouted.
- **Ledgered.** Every raise / resolve / dismiss / reassign is one append-only
  `grounding_conflict_event` row — the `personal_curation_event` accountability precedent.

### 2. Interim answer behavior — answer most-authoritative + labelled, raise in parallel (anti-stall)

The contract **rejects hedge/refuse-until-resolved as the default**. While a conflict is open the
agent **answers immediately** with the **most-authoritative VALID tier, LABELLED**, and raises the
conflict in parallel. "Most authoritative" = **canon > company_silver > personal**, **gated by
temporal validity**: a tier whose claim's validity window has closed (ADR-0114 `valid_to` in the
past) is skipped — so a fresh personal fact can out-rank a stale company claim. The label is shown
to the user (`Canon (OKF): …`, `Company silver: …`, `Personal: …`) so the answer is never presented
as undisputed truth while a conflict is queued.

This is **not** decision 1 (hard precedence) in disguise: precedence here only picks what to *say
now, with a visible label and an open workflow item*; it does **not** silently resolve the system of
record. The owner still decides, and the served answer is recorded on the conflict
(`served_tier` / `served_label`) so the owner sees exactly what users were told in the interim.

The selection is a **pure, provider-agnostic helper** (`src/lib/grounding/authority.ts`,
`resolveGrounding`) — no DB, no AI key (ADR-0043). The orchestrator feeds it the candidate claims
already retrieved from each tier; it returns the labelled interim answer + (if the valid tiers
disagree) a conflict draft to persist. Genuinely-no-data (no valid claim from any tier) is the
*only* case the agent hedges.

### 3. Domain-owner registry shape

`domain_owner` is per concept/domain reference/config (archetype H): `domain` (PK, a coarse
business-area slug or a specific concept name), `label`, `owner_user_id` (the resolving business
owner, nullable), `fallback_role_slug` (default routing role). Seeded with the eight coarse domains
(sales, finance, delivery, service, cmdb, security, marketing, platform), **owners unassigned** —
Mark assigns named owners from the cockpit post-apply (a DATA change, never schema). Broad employee
read (ADR-0100); admin-managed writes.

### 4. Who may resolve

`grounding_conflict` has **broad employee READ** (transparency — any employee can see open conflicts
and the interim answer), but **RESOLUTION is restricted** to the domain's named owner OR its fallback
role OR admin — one predicate, `app_grounding_conflict_resolver(domain)` (the `app_data_class_allowed`
precedent from ADR-0118): `STABLE SECURITY DEFINER`, fail-closed, expressed both as an RLS UPDATE
policy and reusable by the backend at the (deferred) write-back path. No per-client wall — the MSP
isolation axis is `data_class` (ADR-0118), not tenant.

### 5. Resolution write-back is deferred

When the owner resolves, the authoritative correction must flow back to **canon** (an OKF concept-file
edit, raised as an `okf-sync` issue per system CLAUDE.md §11) or **company silver** (a merge/source
correction in the owning plane, ADR-0042). That **execution** path is a backend + cross-plane concern
and is the **deferred follow-up** (filed as a frontend issue at merge). This ADR + migration ship the
registry, the workflow item, the state machine, the ledger, and the interim-answer helper; the
resolution row records the owner's **decision** (`resolution_tier`) + free-text **direction**
(`resolution_note`). Acting on it is the follow-up.

## Options considered

| Option | Verdict |
|---|---|
| Hard precedence (canon > silver > personal) as the system-of-record resolver | **Rejected** — buries disagreements, never corrects the data, no owner. |
| Model arbitration | **Rejected** — unaccountable, non-deterministic, invisible wrong calls. |
| Fork a new conflict state machine for grounding | **Rejected** — duplicates #968 / `personal_contradiction`; we generalize it one tier up instead. |
| Hedge / refuse until resolved (interim) | **Rejected as default** — a stalling agent is useless; we serve the labelled most-authoritative answer + raise in parallel. |
| **Bubble to domain owner + labelled interim answer + ledger (this ADR)** | **Chosen.** |

## Security impact

No new read surface beyond config + a transparency queue (PII-free summaries only — the
orchestrator MUST write `detail` / `served_label` / `*_claim` as summaries, never row content, the
same contract `personal_contradiction.detail` carries). Resolution is least-privilege via
`app_grounding_conflict_resolver` (fail-closed). Every state change is ledgered (append-only). The
migration is additive, idempotent, transactional; NOT prod-applied until Mark runs it (§10.3). No
secrets.

## Cost / operational impact

Three small tables + one predicate function; negligible. Operationally the registry needs owners
assigned post-apply (a one-time cockpit task) — until then conflicts route to each domain's fallback
role, so nothing stalls. Archetype H governance/control — NOT silver, NOT pipeline-merged → no
per-table OKF concept file (the `data_class` 0175/ADR-0118 precedent; `semantic-layer-not-affected`);
the doctrine + coverage-matrix note the grounding-conflict loop.

## Future considerations

- **Resolution write-back** (the deferred follow-up): backend executes the owner's decision into
  canon (okf-sync issue) or silver (merge correction).
- **Auto-reassign / SLA** on stale open conflicts (the `reassign` ledger action is already modeled).
- **Concept-level owners**: `domain_owner.domain` can hold a specific concept name, not just a coarse
  area, when finer routing is wanted.
