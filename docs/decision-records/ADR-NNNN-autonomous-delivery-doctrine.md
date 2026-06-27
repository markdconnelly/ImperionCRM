---
adr: NNNN
title: "Autonomous-delivery doctrine — agent outbound identity, L4 execute-then-notify, dial-proof ceilings"
status: accepted
date: 2026-06-27
repo: frontend
summary: "G3 (agentic-OS action substrate) grill outcome. Sets the front-end doctrine over the backend's already-built autonomous send-leg (backend ADR-0090 / #398 / PR #403 — note: that is the BACKEND ADR namespace's 0090, autonomous-delivery-resolution, NOT this repo's ADR-0090 ADR-ingestion-overhaul; the #398 work carried a placeholder front-end citation, which this ADR now supplies). Three things were unspecified: (a) what identity an agent sends AS, (b) what is auto-executable vs must-approve, (c) how the 1-5 autonomy dial interacts with hard limits. Decides: D1 attributable-by-default agent identity (asAgentMailbox, never silent employee impersonation); D2 reversibility gates autonomy (L4 = execute-then-notify with an undo window, reversible actions only; irreversible classes park regardless of dial); D3 dial-proof ceilings (the dial raises the floor, never breaches the gauntlet's hard ceiling). Cites ADR-0107 (gauntlet/tool-grant), ADR-0109 (1-5 dial + cockpit), ADR-0118 (data_class ceiling), #996 (hard-ceiling classes), #402 (L4 follow-up)."
tags: [agents, governance, security]
---
# ADR-NNNN: Autonomous-delivery doctrine — outbound identity, L4 execute-then-notify, dial-proof ceilings

<!-- Number is a placeholder until merge (system CLAUDE.md §10.3). Claim the next free number at merge; renumber the file and every reference if it collides. -->

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-27 |
| **Cross-references** | ADR-0107 (governed action & tool-grant plane — the gauntlet), ADR-0109 (1–5 actuation autonomy dial + approval cockpit), ADR-0118 (`data_class` action-plane sensitivity ceiling), ADR-0111 (agent event substrate), backend ADR-0090 (autonomous-delivery-resolution — the send-leg mechanism this doctrine governs), #996 (hard-ceiling action classes), #402 (L4 `execute_notify` follow-up), #398 / PR #403 (the autonomous send-leg) |

## Problem

Autonomous agents send outbound comms and execute actions on the company's behalf. The
mechanism for resolving an unattended send's delivery params is already built — the
backend's `autonomous-delivery.ts` resolver (#398 / PR #403) resolves the recipient from
the contact and sends via the shared agent mailbox, parking fail-safe when anything is
unresolvable. But three **doctrine** questions sat above that mechanism with no front-end
decision record:

1. **What identity does an agent send AS?** Nothing said whether an autonomous send goes
   out as the employee whose pipeline it serves, or as the agent itself.
2. **What is auto-executable vs must-approve?** The 1–5 dial (ADR-0109) routes to
   `execute` / `execute_notify` / `cockpit`, but nothing pinned *which classes of action*
   may ever ride the auto branch.
3. **How does the dial interact with hard limits?** Whether a high earned-autonomy dial
   could, in principle, cross a class that must always be human-gated was unspecified.

Separately, a **namespace clarification.** The #398 autonomous-delivery send-leg cited
"ADR-0090". That is the **backend** repo's ADR-0090 (`autonomous-delivery-resolution`,
accepted 2026-06-24), which is the correct mechanism record in *its own* per-repo ADR
sequence. It is **not** this repo's ADR-0090 (`ADR-ingestion-overhaul`). ADR numbers are
per-repo, so there is no cross-repo collision to "fix" in the backend — its citation is
correct. What was missing was the **front-end doctrine** that governs that mechanism; the
#398 work carried a placeholder front-end citation until this ADR. This ADR supplies it.

## Context

- The backend `autonomous-delivery.ts` resolver (#398) resolves `to` from the contact
  record and sends via `asAgentMailbox` — an **app-owned** identity, NOT the employee
  connection — and is **fail-safe-to-park** when the recipient or mailbox is unresolvable.
  The `action-catalog` carries `ActionDelivery.asAgentMailbox` on `send_email`.
- That path is currently **DORMANT**: gauntlet gate 3 (tool-grant, ADR-0107) is
  deny-by-default, so every autonomous comms/Autotask action is `withheld` and the send
  branch is unreachable in v1.
- L4 `execute_notify` (the autonomy dial's level-4 route, ADR-0109) is **deferred to #402**
  — it needs a notify sink + an undo store the current path does not have.
- The 1–5 autonomy dial (ADR-0109) maps an earned posture to a tier ceiling; the gauntlet
  (ADR-0107) is the ordered gate sequence; the hard-ceiling action classes
  (financial / security / client-PII) are #996 + the `data_class` ceiling (ADR-0118).

## Options considered

1. **Send as the employee mailbox** (the per-user connection). Rejected — it is silent
   impersonation: recipients and the audit trail cannot tell an agent acted, which breaks
   attribution and the "approver is the audited actor" invariant.
2. **Send as a distinct, attributable agent identity** (`asAgentMailbox`, app-owned).
   Chosen — every recipient and every audit row sees that an agent sent it.

## Decision

**D1 — Attributable-by-default identity.** Agents send external comms as a **distinct,
attributable agent identity** (`asAgentMailbox`, app-owned). An agent **never** silently
sends as the employee. Recipients and the audit trail always see that the sender is an
agent. *Exception:* inside an employee-owned thread, an agent may send from that
employee's mailbox **only** with the employee's explicit grant **and** with visible agent
attribution — never silently.

**D2 — Reversibility gates autonomy.** Level 4 (`execute_notify`, #402) is
**execute-then-notify with an undo window**, and it is restricted to **reversible actions
only**. Irreversible classes — a financial commit, an external client-facing send — **park
to the cockpit for pre-approval regardless of the dial**. The undo-window length is set
**per action class**, not globally.

**D3 — Dial-proof ceilings.** At dispatch, the system resolves the action's tier ceiling
from the autonomy grant (`agent_action_autonomy`); gauntlet **gate 7** (`actuation_level`,
ADR-0107/0109) enforces it. Gauntlet **gate 8** (`hard_ceiling`) is the always-gate for the
financial / security / client-PII classes (ADR-0118 + #996) and is **never crossable by
earned autonomy**. The dial **raises the floor, never breaches the ceiling**: a maxed dial
can widen what auto-executes up to the ceiling, but cannot cross gate 8.

This ADR **supersedes the placeholder front-end citation** that the #398 autonomous-delivery
send-leg carried for its governing doctrine. (It does **not** touch the backend's ADR-0090,
which correctly records the send-leg *mechanism* in the backend's own ADR namespace.)

## Consequences

### Security impact

Attribution (D1) prevents agent-as-human impersonation and keeps the audit trail honest.
Dial-proof ceilings (D3) prevent earned autonomy from ever reaching a financial / security /
client-PII action without a human — gate 8 is unconditional. Reversibility-gating (D2)
bounds blast radius: only undoable actions ever auto-execute, and irreversible ones always
get a human. The whole path remains fail-closed and dormant (gate 3 deny-by-default) until
a grant exists and Mark opens the test stage.

### Cost impact

None structural — the resolver and catalog already exist; this is doctrine over built
mechanism.

### Operational impact

L4 needs a **notify sink + an undo store** (#402) before `execute_notify` can light up. The
dormant resolver lights up only when gate-3 grants the action **and** the dial is raised —
both Mark-gated. No schema change.

## Future considerations

- Per-action-class undo-window tuning as L4 (#402) lands.
- Agent-mailbox provisioning + lifecycle (the `asAgentMailbox` identity as a first-class
  managed object).
- Generalizing the attributable-identity rule to non-email channels (SMS, social DM) as
  those actuators land.
