---
adr: 0050
title: "AI pages are admin-only; Settings gains an AI tab"
status: accepted
date: 2026-06-10
repo: frontend
summary: "`canSeeAgentPages` (admin-only) gates the AI Agents and Board pages at all layers; Settings gains an AI tab."
tags: [authz]
---
# ADR-0050: AI pages are admin-only; Settings gains an AI tab

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-10 |
| **Amends** | ADR-0048 (page visibility), ADR-0036 (Settings tab list); supersedes the `sales:write` convene gate chosen with ADR-0049 |
| **Cross-references** | backend ADR-0037 |

## Problem

Issue #90 asked for two things: surface the orchestrator's tier preset, hard
monthly budget cap, and month-to-date spend in Settings, and admin-gate the AI
Agents and Board pages so non-admins see neither. ADR-0048 had decided the AI
Agents page "stays visible to all roles" (read-only card for non-admins), and
the board's convene action was gated `sales:write` — both now conflict with the
requested access model.

## Context

- Settings is already admin-only at three layers (ADR-0030): nav filter
  (`NAV_GUARD`), the edge middleware `authorized` callback, and a page-level
  redirect. The AI pages had none of these.
- The orchestrator settings card (preset / budget / spend, backend GET/PUT
  `/agent/settings`, backend ADR-0037) already exists on the AI Agents page
  (ADR-0048) — the Settings AI tab reuses it, including the read-tier
  degradation (backend → direct DB → mock) and the `settings:write`-guarded
  save action.
- ADR-0045's principle: page visibility is GUI courtesy; server actions are
  reachable endpoints and must carry their own capability gate. A page-only
  gate over a `sales:write` convene action would leave a costed, premium-tier
  process invokable by roles that can no longer even see the page.

## Options considered

1. **Gate pages + tighten convene to a new admin-only `agents:operate`
   capability (this decision).** One predicate (`canSeeAgentPages`) drives nav,
   middleware, and page guards; the capability matrix stays the single source
   of truth for the write gate.
2. Gate pages only, keep convene at `sales:write` (rejected — reopens exactly
   the GUI-trust gap ADR-0045 closed; a sales user could convene by POSTing the
   action directly).
3. Gate convene with `settings:write` (rejected — convening isn't
   configuration; overloading the settings capability blurs the matrix).
4. Keep ADR-0048's all-roles visibility and only add the Settings tab
   (rejected — contradicts #90's acceptance criteria).

### Tradeoffs

Tightening convene locks business-development roles out of a surface built for
their questions — accepted for now because the pages are invisible to them
anyway, the spend is real, and re-granting later is a one-line matrix change
(see Operational impact). Option 2 preserved their access but only through an
endpoint the GUI no longer exposes, which is a trust gap, not a feature. The
duplicated settings card on two pages costs a second render of the same state;
sharing the card component and save action keeps the duplication presentational
only.

## Decision

- New role predicate `canSeeAgentPages` (admin-only) gates the AI Agents and
  Board pages (list **and** transcript detail) at all three layers: `NAV_GUARD`
  (`agents`, `board`), the edge `authorized` callback (`/agents`, `/board`
  path prefixes), and server-side redirects in each page.
- New capability `agents:operate` (no roles besides implicit admin) in the
  ADR-0045 matrix; `conveneBoardAction` requires it. ADR-0049's runtime and
  persistence decisions are untouched — only the convene capability moves.
- Settings gains an **AI** tab rendering the same `OrchestratorSettingsCard`
  with the same save action, which now revalidates both `/agents` and
  `/settings`. The shared source-tier notice lives in the pure
  `settingsSourceNote` helper.

## Consequences

### Security impact

Positive: the agent layer's costed operations (board deliberations) and
org-wide model/budget controls are admin-only end to end — nav, edge, page,
and action — instead of GUI-only. Fail-closed semantics of `requireCapability`
are unchanged.

### Cost impact

None at runtime. Convening (a multi-call premium-tier process) is now
restricted to admins, reducing accidental spend surface.

### Operational impact

Sales/PM/finance/support users lose sight of the AI Agents and Board pages and
the ability to convene. If the board should later open to business-development
roles, grant `agents:operate` to those roles in the matrix (one line, covered
by the RBAC stress suite) and relax `canSeeAgentPages` — a deliberate, recorded
decision rather than a default.

## Future considerations

- HITL approval flows (#86–#88) may want a finer split between *viewing* agent
  activity and *operating* the agent layer; `agents:operate` is the natural
  hook.
- If more admin-only AI surfaces appear, keep them on `canSeeAgentPages` rather
  than minting per-page predicates.
