---
adr: 0118
title: "data_class — the third RLS axis + the action-plane sensitivity ceiling"
status: proposed
date: 2026-06-22
repo: frontend
summary: "Isolation across the MSP's client tenants is by DATA SENSITIVITY, not client. Five coarse, role-mapped classes (operational/CMDB · financial · people_hr · security_credentials · client_pii) become the THIRD RLS read-predicate alongside owner (ADR-0105 app.user_id) and role (app.groups), AND a ceiling on the governed action/tool-grant plane (ADR-0107): an action's data_class must be within the caller/agent's permitted classes. One source of truth — data_class_role_grant — read by both layers via app_data_class_allowed(). always-gate classes (money/customer-facing/credentials) are modeled as the hard ceiling earned autonomy can never cross (#1036)."
tags: [meta, security, agents]
---

# ADR-0118: data_class — the third RLS axis + the action-plane sensitivity ceiling

> **Number is a placeholder.** ADR-0118 is claimed at MERGE per system CLAUDE.md §10.3 — the
> branch that merges second renumbers. The migration is authored as
> `0175_data_class_rls_axis.sql` against a placeholder number likewise.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + this ADR); backend owns action-plane enforcement runtime |
| **Status** | Proposed |
| **Date** | 2026-06-22 |
| **Issue** | #1034 |
| **Cross-references** | ADR-0105 (two-axis RLS access spine), ADR-0107 (governed action & tool-grant plane), ADR-0109 (actuation autonomy dial), ADR-0100 (broad employee read v1), ADR-0086 (OKF semantic layer), agentic-OS design contract (2026-06-21, decisions 1–3 + 5), epic #967 / #990, future #1036 (earned autonomy hard ceilings), migration 0163 (data_class stamped on the agent tables) |

## Problem

The access spine has two axes — **owner** (`app.user_id`, ADR-0105) and **company/role**
(`app.groups`). Neither answers the question the MSP actually isolates on. An MSP technician
serves *every* client, so `account`/`client` is **lineage, not a wall** (agentic-OS contract
decision 1): employees — and the autonomous agents acting with the same all-client reach
(decision 3) — roam all clients freely. What must be gated is **data sensitivity**: a technician
should not read a Financial row or a People-HR row, and must not invoke a Financial-class action,
even though they can see every client's tickets.

There is today no axis for this. The 5-class taxonomy was *stamped* on the agent tables
(`agent_conversation`, `agent_pending_action`, `agent_action_autonomy` — migration 0163) but
**nothing reads it**: no RLS predicate enforces it on reads, and the governed action plane
(ADR-0107) gates on tier, not on sensitivity. With autonomous agents getting the same all-client
reach as employees (decision 3), the `data_class` taxonomy + its always-gate classes become
**the** primary containment control — so it must actually bite, at both the read and the action
layer.

## Context

- **Taxonomy already chosen.** Migration 0163 fixed the 5-class CHECK on the agent tables:
  `operational · financial · people_hr · security_credentials · client_pii`. This ADR canonizes
  that set and makes it enforceable; it does not re-litigate the classes.
- **The RLS spine is live machinery.** `withIdentity` injects `app.user_id`/`app.oid`/`app.groups`
  as `SET LOCAL` GUCs inside each request transaction (ADR-0105); policies read them with
  `current_setting(…, true)` (fail-closed). `app.groups` carries **normalized app-role slugs**
  (ADR-0105 slice-3 vocabulary). A third predicate slots in beside the existing two with no new
  plumbing.
- **The action plane is deny-by-default and choke-pointed** (ADR-0107): one orchestrator, one
  dispatch boundary, grants as data. A sensitivity ceiling is one more check at that boundary —
  evaluated on the action's `data_class`, using the same rule the read predicate uses.
- **ADR-0100 makes v1 reads broad.** Every signed-in employee reads company data broadly in v1;
  the only live exception is server-side comp/finance redaction. So the read axis must be
  **wired and provable** but seeded **broad** — tightening a class to fewer roles is then a DATA
  change, never a behaviour-breaking retrofit. The action ceiling is where sensitivity actually
  bites in v1 (drafts vs auto-sends of always-gate classes).
- **Enabling RLS on a live read path breaks it** (the slice-2 lesson, ADR-0105). The first read
  policy must land on a **greenfield classed table** whose reads all route through `withIdentity`.

## Options considered

1. **Client-tenant axis** — isolate by `account`/client tenant (a per-client wall).
2. **Read-only enforcement** — add the `data_class` RLS predicate, leave actions on tier alone.
3. **data_class as the third axis at BOTH layers** — one role→class grant table, one shared
   predicate (`app_data_class_allowed`), enforced as the third RLS read-predicate AND as the
   action-plane ceiling. (Chosen.)

### Tradeoffs

| Option | Pro | Con |
|---|---|---|
| 1 Client-tenant | matches naive multi-tenant intuition | **contradicts the business**: techs serve every client; a per-client wall blocks the core workflow and the org-wide automations (fleet posture sweeps) decision 3 wants. Rejected. |
| 2 Read-only | smaller | leaves the bigger hole open — an autonomous agent with all-client reach could *act* across a sensitive class even if it couldn't read one. Half a control. Rejected. |
| 3 Both layers, one rule | reads + actions share ONE source of truth → no drift; the action ceiling is the v1 control while reads stay broad per ADR-0100; turns the dormant 0163 stamp live; expresses the #1036 hard ceiling as data | we build the grant table, the predicate, the first policy, and the ceiling check | 

## Decision

Adopt **`data_class` as the third access axis, enforced at both the read and the action layer
from one source of truth** (migration 0175):

### D1 — The taxonomy (5 coarse, role-mapped classes)
`operational` (CMDB/tickets/assets — the broad-read default) · `financial` (money) · `people_hr`
(staff HR) · `security_credentials` (secret metadata, posture, registry) · `client_pii`
(customer-facing + client personal data). Canonized in the `data_class` reference table.

### D2 — One source of truth: `data_class_role_grant`
A reference table mapping an **app-role slug** (`app.groups` element) → a `data_class` it may
reach. Read by **both** layers. Seeded to **exactly today's reach** (ADR-0100 broad read) so the
apply is behaviour-preserving; tightening a class is a one-row data change.

### D3 — Read enforcement: the third RLS predicate
`app_data_class_allowed(target_class text) → boolean` (STABLE, SECURITY DEFINER, fail-closed on
unset `app.groups`) returns TRUE when the caller's roles are granted the class. The first read
policy lands on **`agent_conversation` only** — a greenfield classed table (0163), not yet
prod-applied, whose reads route through `withIdentity` — proving the axis end-to-end with **zero
risk to a live read path** (the slice-2 greenfield precedent). Owner/company axes are *not* added
to this table (broad-read per ADR-0100); this is the `data_class` axis in isolation.

### D4 — Action enforcement: the sensitivity ceiling on the governed action plane
On the action / tool-grant plane (ADR-0107), an action's `data_class` must be **within** the
caller/agent's permitted classes, else it is **refused** (sub-agent dispatch — `is_error` tool
result + audit, the ADR-0107 D1 contract) or **routed to the approval cockpit** (autonomous /
actuation path, ADR-0109 D5). The backend dispatch reads the **same** `data_class_role_grant`
table the RLS predicate reads (one rule, two layers). The FE mirror is
`src/lib/security/data-class.ts` (`actionWithinCeiling`), used to label/gate proposed actions in
the approval surface; the backend is the authoritative enforcer.

### D5 — always-gate classes = the hard ceiling (modeled now, enforced by #1036)
`financial`, `security_credentials`, `client_pii` are **always-gate** (`data_class.always_gate =
true`): the hard ceiling earned/graduated autonomy (#1036 / ADR-0109) can **never** auto-cross —
money / customer-facing / credentials always surface to a human, regardless of any track record.
The column lands now so #1036 is a DATA/runtime change, never a schema change; this ADR does not
itself change autonomy behaviour.

### D6 — data_class is a first-class audited attribute on OKF + action contracts
Every OKF concept file and every action contract carries a `data_class`. The doctrine
(`data-and-automation-doctrine.md`) and the coverage matrix gain a `data_class` column; a
representative set of concept files is tagged in this PR, with the full per-concept backfill
tracked as a follow-up issue (the ~46-concept backfill exceeds the micro-PR budget).

## Consequences

### Security impact

- **The real isolation axis becomes enforceable.** Sensitivity — the thing the MSP actually
  isolates on — is now a hard predicate at the storage floor and a ceiling at the action choke
  point, from one source of truth, so reads and actions cannot drift apart.
- **The primary containment for all-client autonomous reach.** Decision 3 gives autonomous agents
  the same all-client reach as employees; `data_class` + the always-gate classes are exactly the
  control that keeps that safe — an autonomous agent cannot act in an always-gate class without a
  human, no matter how broad its reach.
- **Fail-closed everywhere.** Unset `app.groups` → no role → no class → no rows / refused action;
  an unknown action class is never within any ceiling. Pinned by `data-class.test.ts` (action
  layer) and the live cross-class matrix in `docs/testing/rls-access-spine.md` (read layer).
- **v1 stays broad-read (ADR-0100) by seeding, not by weakening the mechanism.** The axis is
  fully wired; the seed grants today's reach. Compartmenting a class later is a data change.
- No secrets, no PII in schema/ADR/grants — class names + role slugs only (**Never commit
  secrets**).

### Cost impact

Negligible. The predicate is a keyed lookup on a tiny config table (cacheable per run); no new
infrastructure, no model calls.

### Operational impact

- New dormant migration `0175` (Mark-gated prod apply, like every migration). Behaviour-preserving
  on apply: the seed reproduces today's reach and the only read policy is on a greenfield table.
- Before enabling in prod, re-verify the live role attributes (non-BYPASSRLS) and run the
  cross-class read matrix in `docs/testing/rls-access-spine.md`.
- The backend wires the action ceiling at dispatch (a backend issue tracks the runtime); the FE
  mirror + the read axis ship here.

## Future considerations

- **Full per-concept `data_class` backfill** (the ~46 OKF concept files) — the follow-up issue.
- **Tighten classes when a driver appears** — compartmented clients / restricted contractors
  (the ADR-0100 triggers) flip seed rows from broad to scoped; the mechanism is already live.
- **#1036 earned autonomy** reads `data_class.always_gate` as the hard ceiling on the dial.
- **Extend the read policy to more classed tables** as their reads route through `withIdentity`
  (the table-by-table rollout pattern, ADR-0105).
- **A per-agent data_class ceiling** on `agent_action_autonomy.data_class` (0163) lets a dial row
  scope a level to a single class — the granular version of D4.
