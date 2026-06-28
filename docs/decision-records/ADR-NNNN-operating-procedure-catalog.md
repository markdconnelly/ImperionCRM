---
adr: NNNN
title: "Operating Procedure catalog — a provable-coverage map of every MSP procedure, value-stream-first, one owning agent each"
status: proposed
date: 2026-06-28
repo: frontend
summary: "Introduce the Operating Procedure catalog: the enumerated, provable map of WHAT the 26-agent org (ADR-0131) actually does, distinct from structure (ERD/migrations), code (Graphify) and meaning (OKF). Two new canonical terms — Operating Procedure (one end-to-end MSP procedure, exactly one owning agent, runbook-sized) and Procedure Step (tagged [automation]/[gui-step]/[hybrid]). Procedures are enumerated value-stream-first (11 streams = the closed set of what an MSP does) then projected onto their one owner, so coverage is provable and seams/ownership-holes are explicit. A procedure with >=1 automatable step is realized IN its ICM Workspace = live SoR (no competing file home, D5); fully-human procedures live as docs/runbooks/ until they graduate; the human runbook is a generated projection (Lexicon -> IT Glue). Each procedure references its driving company policy (the icm/policies/ IMxxx canon, #1586/#1587), carries an autonomy ceiling with dial-proof always_gate steps, and an easy-button at every human gate. The catalog index + 11 stream files land under docs/workflows/; per-procedure icm/ workspaces are a later build (epic #1534)."
tags: [agents, governance, workflows]
---

# ADR-NNNN: Operating Procedure catalog — a provable-coverage map of every MSP procedure

> Number claimed at MERGE per system CLAUDE.md §10.3. Authored against the
> placeholder `NNNN`; just before merge the branch is rebased on current `main`,
> the next free ADR number is taken (expected **0133** — current max is 0132),
> this file is renamed, and every reference (CONTEXT.md, the catalog index, all
> 11 stream files, and the `_HEADER` they share) is fixed. No global counter is
> reserved at authoring time.

| Field | Value |
|---|---|
| **Repo** | frontend (owns `icm/`, the schema, the OKF bundle, and the docs tree) |
| **Status** | Proposed |
| **Date** | 2026-06-28 |
| **Cross-references** | [ADR-0131](ADR-0131-executive-suite-tier.md) (the 26-agent org this catalogs), [ADR-0128](ADR-0128-canonical-agent-autonomy-ladder.md) (the L0–L5 ladder each procedure's ceiling maps onto), [ADR-0061](ADR-0061-icm-business-process-automation.md) (the ICM factory — a workspace is the live SoR), [ADR-0088](ADR-0088-icm-self-hosted-managed-agents-runtime.md) (the Managed-Agents runtime + least-privilege budgets), [ADR-0058](ADR-0058-composer-sends-via-approval-gated-backend-path.md) (the gauntlet every actuation crosses), [ADR-0086](ADR-0086-okf-semantic-layer-over-silver.md) (the OKF meaning layer Lexicon syncs alongside), [ADR-0042](ADR-0042-division-of-labor-reads-direct-processes-backend.md) (GUI-only authoring; the backend executes) |
| **Companion** | `icm/policies/` company information-security policy canon (#1586 / PR #1587) — the D4 driving-policy source |

## Problem

The agent roster has grown to a **26-agent organization** (ADR-0131): one orchestrator
(Nova), five C-suite leaders, and twenty sub-agents that are meant to run and scale a
security-minded MSP on AI leverage. We have, by now, three of the four views an
operating organization needs:

- **Structure** — the ERD + migrations (what data exists).
- **Code** — Graphify + the ADRs (how it is built).
- **Meaning** — the OKF semantic layer (ADR-0086: what each silver entity *means*, which
  source wins, how it joins).

What we do **not** have is the fourth view: **WHAT the organization actually does** — the
enumerated set of business procedures that run the MSP, each owned by exactly one agent,
each written so a human could follow it. Without that view:

- **Coverage is unprovable.** "Have we modeled everything an MSP does?" has no answer; we
  discover gaps (e.g. Problem Management, monitoring ingestion) by accident, late.
- **Ownership is ambiguous.** Two agents plausibly own collections, or AP intake, or
  SLA-aware assignment, and nothing forces the call.
- **There is no training-runbook source.** A new human hire (and the dogfood program)
  needs the same step-by-step a new agent does; today neither exists in one place.
- **There is nowhere to attach the governance metadata per unit of work** — the driving
  company policy, the autonomy ceiling, the dial-proof `always_gate` steps, the substrate
  dependencies. These currently live scattered across personas, epics, and chat.

We also must not invent a fourth file home that competes with the ICM framework's
already-reserved vocabulary (Workflow / ICM Workspace / Playbook / Sequence / Stage
Contract / Checkpoint) or with the unified `task` object.

## Context

- **CONTEXT.md reserves the ICM terms.** "Workflow", "ICM Workspace", "Playbook",
  "Stage", and "task" all have fixed meanings. A new catalog unit cannot overload them.
- **The ICM Workspace is the live system of record** (ADR-0061): an automated procedure's
  truth is its `icm/.../<wf>/` files + platform run records, not a parallel document.
- **`icm/policies/` now exists on `main`** (the company information-security policy canon,
  IM001–IM026 + the Enterprise Info-Sec Program + Technical Incident-Response Program,
  #1586 / PR #1587). Mark's directive: *"all workflows must adhere to these as we build
  them."* That makes company policy a first-class driver of every procedure (D4) — but the
  canon is **info-sec-scoped**, so security/IT procedures map cleanly to an `IMxxx` doc
  while marketing/sales/finance procedures map only to the cross-cutting ones (access,
  data classification) plus business policies not yet authored.
- **Lexicon (Doc-Hygiene) syncs `icm/` → human runbooks → IT Glue** (the org recast,
  [[imperion-os-org-recast]]). The human-facing runbook must therefore be a *generated
  projection*, not an independent source that can drift.
- **The autonomy contract is the canonical ladder** (ADR-0128) + the dial + hard ceilings
  (ADR-0109/0118). Every procedure's actuation crosses the gauntlet (ADR-0058). v1 is
  capability-complete L0–L5 with the production dial starting conservative.

## Options considered

### Option A — Enumerate agent-first (one list per agent), no value-stream spine
Walk each of the 26 agents and list its procedures directly.
**Rejected.** Coverage is unprovable — there is no closed set to check against, so holes
(an MSP activity no agent claims) and overlaps (two agents claim one activity) are
invisible until they bite. The agent-first view is still valuable, but as a *derived
projection* of the spine (the epic tree #1545–1562), not the source.

### Option B — Reuse the ICM "Workflow" term for the catalog unit
Call each catalog entry a Workflow and skip new vocabulary.
**Rejected.** It collides head-on with the reserved ICM Workflow / Workspace and with the
in-app Workflows module, and it conflates the *catalog definition* (a documented unit of
work) with the *realized automation* (the live workspace). The catalog needs a term that
spans fully-human, hybrid, and fully-automated procedures uniformly.

### Option C — Model the catalog as a database schema (an `operating_procedure` table + steps)
Persist procedures as rows so the GUI can render them.
**Rejected.** It creates a second source of truth that must be kept in sync with the
`icm/` workspaces (the real SoR) and the org tree (`icm/org.yaml`, ADR-0131). The catalog
is *documentation that maps onto* those sources; the GUI derives the org/flow view from
`icm/` manifests + `org.yaml` (ADR-0131 / epic #1539), not from a duplicate procedure
table.

### Tradeoffs
The chosen approach (value-stream-first docs that point at the `icm/` SoR) costs a manual
"keep the catalog in step with the workspaces" discipline — mitigated by a future
conformance check (Future considerations) and by Lexicon's sync mandate. In exchange we
get provable coverage, a single SoR per procedure, no schema to migrate, and a catalog
that doubles as the human training runbook.

## Decision

Adopt the **Operating Procedure catalog**, defined by nine decisions (D1–D9):

- **D1 — Two new canonical terms** (in CONTEXT.md, respecting all ICM reservations):
  **Operating Procedure** (one end-to-end MSP procedure, exactly one owning agent,
  runbook-sized; *realized in* its ICM Workspace when automated, never a competing home)
  and **Procedure Step** (tagged `[automation]` / `[gui-step]` / `[hybrid]`; maps onto an
  ICM Stage when automated; **not** the `task` object).
- **D2 — Value-stream-first enumeration.** Generate procedures by the **11 value streams**
  (the closed set of "what an MSP does"), then **project each onto its one owning agent**.
  Coverage is provable against the stream; the agent-first view is the derived projection.
- **D3 — Sizing rule.** A procedure has all four: a named **trigger**, **exactly one
  owning agent** (a cross-agent stream splits at each hand-off into linked per-agent
  procedures), a **terminal business outcome**, and **runbook-sized** (~3–8 Procedure
  Steps).
- **D4 — Driving policy.** Each procedure **references** the company policy/policies that
  drive it — the `icm/policies/` IMxxx canon (#1586 / PR #1587). Until the per-procedure
  mapping pass, the field reads `TBD (mark-blocker: company-policy-collection)` (#1586);
  the canon now being on `main` unblocks that pass.
- **D5 — Realization = the ICM Workspace is the SoR; no competing structure.** A procedure
  with ≥1 `[automation]`/`[hybrid]` step is realized IN its ICM Workspace (live SoR); a
  fully-human procedure lives as `docs/runbooks/<stream>/<proc>.md` until it graduates; the
  human runbook is a **generated projection** (Lexicon → IT Glue), never an independent SoR.
- **D6 — Entry schema + home.** Each entry carries: Name · Owner/Stream · Trigger ·
  Terminal outcome · Procedure Steps (ordered, tagged, hand-offs explicit) · Driving
  policy · Realization (workspace path | procedure-only) · Autonomy ceiling (owner ladder
  ceiling + flagged `always_gate` steps) · Human-in-loop · Substrate deps · `subject`.
  **Home:** the index `docs/workflows/operating-procedure-catalog.md` + one file per stream
  under `docs/workflows/streams/`; per-procedure runbooks under `docs/runbooks/<stream>/`.
- **D7 — Scope.** OS-self-operation procedures are **in scope** (running the agentic OS is
  running the company). **Dogfood is a `subject: client | imperion` parameter, not a
  duplicate** (Imperion is a real managed client). Human-in-loop is **YES and
  dial-dependent** — involvement recedes as the dial climbs, but the human stays on
  `always_gate` hard-stops forever.
- **D8 — Cross-cutting ownership rulings.** Security Posture Management → Cyrus (measure-
  only; Vera owns the Standard, Celeste presents, human + Datto remediate). Collections /
  AR-dunning + AP intake → Audrey (read-only/L2, so the dunning *send* is a human
  `[gui-step]`/`always_gate` in v1). Connection-health → Vera (platform function).
  SLA → Celeste. Cross-client-confidentiality procedure **dropped → the pool principle**
  (correlate internally, never bleed client-facing).
- **D9 — Catalog-wide principles** (apply to all procedures): **P1** Nova-native human
  co-working; **P2** thought attribution up the chain; **P3** an "easy button" at every
  human gate (drive to the goal, hand the human a one-click resolution); **P4** notify
  urgent → dedicated chat, else → tag in the shared Teams chat.

This PR lands the **outline layer** (issue #1581): CONTEXT.md terms, this ADR, the index,
and the 11 stream files. Per-procedure `icm/` workspace authoring, the driving-policy
mapping pass, and `docs/runbooks/` generation are later phases under epic #1534.

## Consequences

### Security impact
The catalog is a **governance artifact**: every procedure now has a named autonomy ceiling
with its dial-proof `always_gate` steps written down, and (once D4's mapping pass runs) a
named driving policy tying it to the `icm/policies/` info-sec canon — making "does this
automated action have an authorizing policy and a human hard-stop?" answerable per unit of
work. Conformance to the policy canon becomes checkable. The catalog itself carries **no
client PII, no secrets, no row-level data** (ADR-0086 boundary); procedures *reference*
data classes and policies, never restate sensitive content. The pool principle (D8) is
recorded as a hard rule: cross-correlate internally, never permit client-facing bleed
(RLS / data-class enforce it).

### Cost impact
Documentation only — no schema, no migration, no runtime cost. The downstream `icm/`
workspace build (epic #1534) carries its own cost, separately scoped.

### Operational impact
The catalog becomes the **single coverage map** for the org build and the **human training
runbook** source (Lexicon → IT Glue). It surfaced four schema gaps now filed as #1577
(problem/known_error silver), #1578 (monitoring/alert bronze feed), #1579
(change_freeze/rollback/standard-change catalog), and #1580 (AR/invoice silver own-vs-
mirror). It introduces one standing discipline: the catalog must stay in step with the
`icm/` workspaces as they are built (mitigated below).

## Future considerations

- **Driving-policy mapping pass (D4).** Now unblocked (`icm/policies/` is on `main`): map
  each procedure's Driving-policy field from `TBD (#1586)` to the specific `IMxxx` doc(s),
  flagging procedures whose primary business policy (brand, consent, ad-spend) is not yet
  in the canon.
- **Per-procedure `icm/` workspace authoring** under epic #1534 (per-agent epics
  #1545–1562): the built-8 agents wire into `org.yaml`; the 18 new agents get full anatomy.
- **A conformance check** that every `icm/.../<wf>/` workspace has a catalog entry and that
  every automatable catalog procedure points at a real workspace path (extends
  `icm-conformance`), closing the drift gap structurally rather than by discipline.
- **GUI projection.** The org/flow view (epic #1539) and a procedure browser render from
  the catalog + `icm/` manifests, never a duplicate store.
