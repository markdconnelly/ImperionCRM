---
adr: 0055
title: "Tiered agent autonomy policy — automation earned by track record"
status: accepted
date: 2026-06-10
repo: frontend
summary: "A four-tier action policy, applied to every agent capability across all four repos"
tags: [agent-icm]
---
# ADR-0055: Tiered agent autonomy policy — automation earned by track record

| Field | Value |
|---|---|
| **Repo** | frontend (system-wide policy; enforcement lands in backend per ADR-0042) |
| **Status** | Accepted (2026-06-10, locked with Mark in the board-vision grilling session, issue #118) |
| **Date** | 2026-06-10 |
| **Cross-references** | backend ADR-0033 (approval-gated actions), ADR-0054 (board governance), product roadmap v1–v3 |

## Context

The standing contract (backend ADR-0033) is propose-only: agents draft, humans approve,
nothing executes autonomously. That is the right v1 posture but cannot be the end state —
"appify every business process and automate as much as possible" requires *some* actions
to run without a human click, while "include the human element" requires that
client-visible and irreversible actions never silently slip into autonomy. Per-process
ad-hoc decisions would relitigate this boundary in every PR.

## Decision

A four-tier action policy, applied to every agent capability across all four repos:

| Tier | Scope | Policy |
|---|---|---|
| **T0** | Read / analyze / search / summarize | Always autonomous. |
| **T1** | Internal, reversible writes (draft tasks, enrichment facts, AI-labeled notes, knowledge syncs) | Autonomous + audited, with undo. AI-authored rows are labeled as such. |
| **T2** | Client-visible actions (email, SMS, proposals, anything a client could see) | Propose-only by default, forever. From v3, an *individual workflow step* may be whitelisted for autonomy only after running in propose mode with a sustained near-100% human-approval streak (threshold recorded on the grant). Whitelisting is per-step, never per-channel. |
| **T3** | Irreversible / financial / permissions / production-data mutations | Human-only. Agents may recommend; they never hold an executing tool grant. |

**Enforcement is mechanical, not aspirational:** the existing `agent_tool_grant` table
(unused since migration 0056) becomes the enforcement point — every tool a sub-agent can
invoke carries a tier in its grant `scope`, the backend tool-use loop refuses calls above
the grant, and T2 whitelist grants record the approval track record that justified them.
ADR accepted in v1; grant enforcement wired by v3.

(Rejected: propose-only forever — caps the automation payoff and keeps the operator as
the bottleneck on high-volume flows; autonomous T2 in v2 — automation granted by optimism
instead of earned by track record; per-process ad-hoc decisions — inconsistent rules and
permanent relitigation.)

## Security impact

This is a security control: least privilege over agent actions, expressed as data and
enforced in one choke point (the backend loop). Mirrors the human-surfacing rules the
project already applies to development tooling. Tier changes are auditable grant changes,
not prompt edits.

## Cost / operational impact

No model-cost change by itself. Operationally, T2 graduation requires the approval-rate
bookkeeping to exist on proposed actions (backend), which v2's real-send work must build
anyway.

## Future considerations

Per-user (not just per-agent) tier ceilings; automatic demotion of a whitelisted step on
its first post-graduation rejection; surfacing tier badges in the UI wherever an agent
proposes or executes.
