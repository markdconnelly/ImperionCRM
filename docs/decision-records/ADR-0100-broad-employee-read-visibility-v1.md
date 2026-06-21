---
adr: 0100
title: "Broad employee read visibility is the v1 posture; object/account-scoped reads deferred"
status: accepted
date: 2026-06-18
repo: frontend
summary: "Resolves #884 (spun out of the #883 security review). Reads stay intentionally broad for all signed-in employees; the app has no account-visibility model (global roles, single trusted tenant) so there is nothing to scope an object read against. The #883 defense-in-depth (UUID validation + provisioned-acting-user fail-closed) remains the pattern for sensitive read feeds. Object/account-scoped visibility (a type-aware canReadWorkParent predicate over the task->project->account chain) is deferred to v2, triggered only by a real driver: compartmented clients, restricted-access contractors, or a least-privilege compliance requirement."
tags: [authorization-rbac]
---
# ADR-0100: Broad employee read visibility is the v1 posture; object/account-scoped reads deferred

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-18 |
| **Cross-references** | frontend ADR-0095 (Authorization & RBAC consolidated); spun out of #883 / #884 |

## Problem

The work-activity feed (`/api/work/{parentType}/{parentId}/activity`) returns comment
bodies and audit `detail` JSON. The codex security review (#883) flagged that, prior to
remediation, any signed-in user could read the feed of any work object by guessing its
UUID (an IDOR). #883 shipped defense-in-depth (UUID validation + a provisioned-acting-user
gate that fails closed) but deliberately did **not** build object/account-scoped read
visibility, deferring that policy choice to this ADR (#884).

The question: should reads on the work-activity feed — and the broader read layer — be
scoped to *object/account visibility*, beyond the "any signed-in employee can read"
posture documented today?

## Context

- **Single-tenant, internal-only.** Imperion OS is used exclusively by
  Imperion employees (ADR-0095). Every authenticated principal is a trusted member of one
  company; there is no client/tenant boundary inside the app.
- **Roles are global, not account-scoped.** The five roles (`admin`, `finance`,
  `project_manager`, `sales`, `support`) derive from Entra groups and apply uniformly;
  the app has **no account-visibility model**. There is nothing today to filter an object
  read against — adding one would be the *first* such concept and would touch the whole
  read layer.
- **Reads are intentionally broad** (ADR-0095): any signed-in employee may read most data,
  with server-side **revenue/comp redaction** as the notable exception. Writes are
  capability-gated; reads are not.
- **Per-type gating is non-obvious.** The Tasks surface is visible to every role (tasks
  span all employees), while projects/milestones sit under the PM-gated `grp-projects`. A
  uniform module gate would either over-restrict task activity or under-restrict
  project/milestone activity.
- **Timeline.** v1.0.0 (first real employee use) is imminent; a read-layer-wide visibility
  predicate is not a micro-PR and is not a go-live blocker.

## Options considered

1. **Accept broad-employee-read as the v1 posture (document + close).** Keep the #883
   defense-in-depth; record that broad read is intentional; revisit if a driver appears.
2. **Build `canReadWorkParent(userId, roles, parentType, parentId)` for v1.** Introduce an
   account-visibility predicate over the task→project→account FK chain plus a "can this
   user see this account" source of truth (ownership / assignment / team), and apply it
   across the read layer.
3. **Reuse `canSeeProjects` (admin|project_manager) as the gate.** Rejected on inspection —
   it would over-restrict task activity, which is universal by design.

### Tradeoffs

Option 2 is the only one that delivers internal need-to-know compartmentalization, but it
invents the first account-visibility concept in the app, fans out across every read
surface, and over/under-restricts per type unless the predicate is type-aware — a
substantial effort for a confidentiality boundary that does not exist between trusted
employees today. Option 1 keeps the shipped defense-in-depth, matches the existing broad
read posture, and costs nothing now. Option 3 is a false economy.

## Decision

**Option 1.** Broad-employee-read is the **accepted v1 posture**. Reads are not
object/account-scoped; the #883 defense-in-depth (UUID validation + provisioned-acting-user
fail-closed) stays as the pattern for sensitive read feeds. #884 is resolved and closed.

This is a deliberate posture decision, not an oversight: with global roles and a single
trusted internal tenant, there is no confidentiality boundary between employees for object
reads to enforce, and revenue/comp remains redacted server-side regardless.

## Consequences

### Security impact

- No new attack surface; the #883 hardening remains in force. The residual exposure —
  one employee reading another internal work object's activity by guessing its UUID — is
  **accepted** for v1 given the single-trusted-tenant model. Revenue/comp redaction is
  unaffected.
- This ADR is the auditable record of that acceptance; the authorization-model tour's
  "Read access" section points here.

### Cost impact

None. No build; avoids a read-layer-wide effort during the go-live window.

### Operational impact

None. No behavioral change from the #883 state.

## Future considerations

Revisit and build object/account-scoped read visibility (Option 2) if any of these
**drivers** appear — tracked as a v2 follow-up:

- Compartmented clients or engagements where employees must be need-to-know separated.
- Contractors / restricted-access staff added to the tenant.
- A compliance or least-privilege requirement (e.g. from the security-posture services
  Imperion sells) that mandates internal read scoping.

When triggered, the v2 design defines the type-aware `canReadWorkParent` predicate over
the task→project→account chain and the "can see account" source of truth (ownership /
assignment / team), applied uniformly across the read layer.
