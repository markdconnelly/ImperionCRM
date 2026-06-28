---
adr: 0079
title: "Change Enablement & Problem Management (ITIL 4 working objects)"
status: accepted
date: 2026-06-28
repo: frontend
summary: "ITIL 4 Change Enablement and Problem Management as app-native working objects on the incident/CMDB spine: change_request (typed standard|normal|emergency, lightweight approval, schedule) plus the governance trio change_freeze/rollback_plan/standard_change_catalog, and problem/known_error as the root-cause investigation register. The website is SoR for the working objects; Autotask remains the incident/change RECORD SoR via gated write-back."
tags: [service-desk, change-enablement, problem-management, itil, cmdb, app-native, archetype-d]
---

# ADR-0079: Change Enablement & Problem Management

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-28 |
| **Amends** | — (amended in place: Problem Management re-added 2026-06-28, #1577; change governance added, #1579) |
| **Cross-references** | ADR-0077 (premium service-management boundary, the parent strategy) · ADR-0044 (ticket = Autotask incident SoR) · ADR-0045 (agent write tools) · ADR-0078 (feedback → app-dev queue) · ADR-0061/0087 (ICM + autonomy dial) · ADR-0128 (autonomy ladder) |

> This ADR was authored late (2026-06-28) to resolve a dangling reference: six concept files
> (`change_request`, `change_freeze`, `rollback_plan`, `standard_change_catalog`, `problem`,
> `known_error`) plus `coverage-matrix.md`/`index.md` cite `ADR-0079-change-enablement.md` as
> their governing decision, but slot 0079 had been an "abandoned collision" with no file. The
> decision itself shipped incrementally (#373/#656–661, then #1577/#1579); this records it and
> reclaims the number so every reference resolves.

## Problem

An MSP needs **Change Enablement** and **Problem Management** — two ITIL 4 practices — over the
managed estate. Autotask provides incident (ticket) records and a change-management module, but:

- We want Imperion to **own the working object** while a change is drafted, risk-assessed,
  approved, and scheduled — and to **govern** it (freeze windows, rollback preconditions,
  pre-authorized standard changes) — rather than round-tripping every intermediate state through
  Autotask.
- **Problem Management** (root-cause investigation behind recurring incidents, plus a known-error
  register) has no natural home in the incident SoR: Autotask owns the *incident*, not the
  *root-cause analysis*. We need an app-native investigation record that links the incidents it
  groups.

The question is where each of these lives, who is the source of record, and how they relate to the
existing incident (`ticket`, ADR-0044) and CMDB (`cmdb_ci` union, #645) spine.

## Context

- **The incident/CMDB spine already exists.** `ticket` is the Autotask-SoR incident (ADR-0044);
  the `cmdb_ci` union (#645) projects accounts/users/devices/cloud assets as configuration items;
  `cmdb_ci_overlay` / `ci_relationship` are the app-native CMDB overlays with a deferred IT Glue
  round-trip (archetype D).
- **Premium service-management boundary (ADR-0077).** Change Enablement and Problem Management
  are in-scope premium practices under the service-desk strategy (#371/#373).
- **History.** #373 originally scoped *both* Change and Problem. On 2026-06-15 Mark dropped Problem
  Management from that slice; only Change shipped (#656–661). Problem was re-added 2026-06-28 as the
  substrate for Sage's `problem-investigation` tracer (#1577, migration 0223). The change governance
  trio (freeze/rollback/standard-change) was the deferred follow-up to #660's "no hard enforcement
  in v1" note, added 2026-06-28 for Marshall's `change-intake` (#1579, migration 0224).
- **Agents consume both.** Sage (problem-mgmt domain) and Marshall (change-release domain) are
  read + internal-`ticket.note` workers under the v1 autonomy ceiling — every state write parks for
  a human (ADR-0128); the workflows *propose*, they do not auto-actuate.

## Options considered

1. **Mirror everything into Autotask immediately** — every draft change / problem becomes an
   Autotask record on creation.
2. **App-native working objects with deferred/gated write-back** — Imperion owns the working object
   (the same archetype-D posture as the CMDB overlays); Autotask remains the record SoR, written via
   a separate gated route only when the change is finalized.
3. **Pure external read-through** — no app-native object; render Autotask change/problem records
   directly.

### Tradeoffs

- **(1)** pollutes the incident SoR with half-formed drafts, couples every intermediate UI state to
  an Autotask write, and offers nowhere to run app-native *governance* (freeze/rollback/standard) or
  a root-cause investigation that has no Autotask analogue.
- **(2)** keeps drafting/approval/scheduling/investigation fast and local, lets us enforce
  governance in the app, and preserves Autotask as the authoritative record via one gated boundary —
  at the cost of a working-copy table per practice and a defined write-back contract.
- **(3)** can't model an app-native investigation or governance gate at all, and ties the UX to
  Autotask latency/availability.

## Decision

Adopt **option 2 — app-native ITIL working objects on the incident/CMDB spine**, archetype D
(app-owned working copy, deferred external write-back).

**Change Enablement (#656–661, migration 0135).** `change_request` is a real persisted row (uuid PK):
typed `standard | normal | emergency`, `status` state machine, CMDB-derived risk
(`risk_override ?? risk_derived`), a **lightweight approval** keyed to type (standard pre-authorizes;
normal/emergency park for a human approver, emergency expedited), and a schedule with a reversible
`approved ↔ scheduled` toggle. `change_affected_ci` links business-key CIs. Autotask is the eventual
**change RECORD SoR** via the gated route (#661, `autotask_change_id`); nothing writes Autotask before
it. Gated `change:write` / `change:approve`.

**Change governance (#1579, migration 0224) — the three gates #660 deferred:**
- `change_freeze` (OP-09) — a freeze-calendar window (global or per-account). A change scheduled into
  an **active** window is a hard `always_gate` block, enforced in the change-intake workflow (0135's
  conflict check was informational-only).
- `rollback_plan` (OP-05) — a structured rollback plan attached to a `change_request` with its own
  `draft → approved | rejected` lifecycle. An **approved** plan is a precondition the change-intake
  workflow checks before approving a normal/emergency change.
- `standard_change_catalog` (OP-10) — pre-authorized standard-change templates; `auto_approve=true`
  lets a matching standard change skip the approval park (normal/emergency always park).

**Problem Management (#1577, migration 0223) — re-added.** `problem` is the app-native root-cause
investigation record (uuid PK): `open → investigating → known_error → resolved`, optional
`account_id`, a primary contributing-incident `ticket_id` (the incident SoR, ADR-0044), and a
`root_cause` narrative populated as it advances. On a workaround it emits a `known_error`
(workaround + permanent fix) — the register a future incident is matched against so the same root
cause is not re-investigated. App-native (the website is SoR for the investigation; `ticket` remains
the incident SoR); a future `problem_incident` bridge can carry the many-incidents set without
reshaping the table. Gated `problem:write` (ADR-0045).

**Source-of-record rule (both practices).** The website is the SoR for the *working object* (the
change while it's drafted/governed; the investigation). The external system (Autotask) is the SoR for
the *record* (the incident; the finalized change), reached only via a gated write-back. The same
override-wins / business-key-link / deferred-write posture as the CMDB overlays.

## Consequences

### Security impact

All writes are permission-gated (`change:write`/`change:approve`, `problem:write`, ADR-0045) and,
for agents, park under the v1 autonomy ceiling (ADR-0128) — Sage/Marshall *propose*, a human
approves. No new external trust boundary: Autotask write-back stays on the existing gated route
(#661). All objects are **operational `data_class`, PII-free** — titles/descriptions, status, CI
business keys, freeze windows, rollback steps, change templates, and root-cause narratives mint no
personal data; display/requester/account names resolve live from the read-only register / silver.
No secrets.

### Cost impact

Negligible — additive silver tables on the existing Postgres store; no new service or provider.

### Operational impact

`semantic-layer` gate now binds each entity to a concept file (`change_request`, `change_freeze`,
`rollback_plan`, `standard_change_catalog`, `problem`, `known_error`) + a `coverage-matrix.md` row.
The change-governance gates are enforced in the **change-intake workflow**, not the DB (the DB holds
the freeze windows / rollback plans / catalog; the workflow reads them as preconditions). Migrations
0135 (change) / 0223 (problem) / 0224 (governance) are additive + idempotent; prod apply is
Mark-gated (§10.3).

## Future considerations

- **`problem_incident` bridge** — many incidents per problem (v1 carries a single primary
  `ticket_id`).
- **Autotask change write-back hardening** (#661) and a possible Autotask *problem* write-back if
  the incident SoR grows a problem module worth mirroring.
- **Post-incident review (run-PIR)** writes against the resolved `problem` (Stream 05); the
  change-intake `always_gate`/`auto_approve` evaluation is the OP-05/09/10 enforcement surface.
- Raising Sage/Marshall off the v1 propose-only ceiling is an autonomy-dial decision (ADR-0061/0087),
  gated on their eval goldens (#1538) and substrate hydration.
