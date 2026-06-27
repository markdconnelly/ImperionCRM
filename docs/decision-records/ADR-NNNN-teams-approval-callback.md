---
adr: NNNN
title: "Teams Adaptive Card approval callback — one decision sink, signed single-use token"
status: accepted
date: 2026-06-27
repo: frontend
summary: "G3 (agentic-OS action substrate) grill outcome. Approvals can flow back from Teams Adaptive Cards (#1089); the callback contract (auth, idempotency, rejection, relationship to the in-app cockpit) was unspecified. Decides: D1 ONE decision sink — the Teams card posts to the SAME cockpit decide endpoint (POST /api/agent/pending-actions/{id}/decide, #397 / PR #400); Teams + web are two surfaces onto one decision record. D2 auth = a signed, single-use, expiring approval token bound to the specific ProposedAction id + decision, embedded in the card, fronted by APIM (backend ADR-0074) with Bot Framework / Teams channel auth on top. D3 idempotent on ProposedAction id + the one-time token (double-tap / redelivery = no-op). D4 approval fills the human-in-loop gate only — it does NOT bypass the gauntlet (grounding-recheck, hard-ceiling, idempotency, egress gates still run at execute time); reject = sequence refused + logged. Cites ADR-0107 (gauntlet), backend ADR-0074 (APIM ingress), #1014 (cockpit surface)."
tags: [agents, governance, integrations]
---
# ADR-NNNN: Teams Adaptive Card approval callback — one decision sink, signed single-use token

<!-- Number is a placeholder until merge (system CLAUDE.md §10.3). Claim the next free number at merge; renumber the file and every reference if it collides. -->

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-27 |
| **Cross-references** | ADR-0107 (governed action & tool-grant plane — the gauntlet), backend ADR-0074 (APIM callback-ingress front door), #1089 (Teams Adaptive Card approvals), #397 / PR #400 (the cockpit `decide` endpoint), #1014 (the in-app operator cockpit `/operator/cockpit`) |

## Problem

Parked agent task-sequences can be approved or rejected from a **Teams Adaptive Card**
(#1089) — the primary out-of-app cockpit channel. But the **callback contract** was
unspecified: how the inbound card action authenticates, whether it is idempotent against
double-taps and Teams redelivery, what a rejection does, and how it relates to the in-app
operator cockpit. Without a pinned contract, a second approval path risks diverging from
the cockpit's decision logic — two engines, drift, and an approval surface that could
become a gauntlet-bypass.

## Context

- The in-app **cockpit decide endpoint** `POST /api/agent/pending-actions/{id}/decide`
  (#397 / PR #400) is the existing state-transition for a parked `ProposedAction`.
- The **operator cockpit** front end `/operator/cockpit` (#1014) is the in-app surface that
  posts to that same endpoint.
- The **APIM ingress** pattern (backend ADR-0074) is the established front door for
  external callbacks — origin keeps signature/authority, APIM fronts it.
- The **gauntlet** (ADR-0107) is the ordered gate sequence every action passes at execute
  time; human approval is one gate among many, not a replacement for the rest.

## Decision

**D1 — One decision sink.** The Teams card action posts to the **SAME** cockpit decide
endpoint (`POST /api/agent/pending-actions/{id}/decide`). Teams and the web cockpit are
**two surfaces onto one decision record** — there is no separate Teams approval engine and
no divergent approval logic. One state machine, two front doors.

**D2 — Auth.** The card carries a **signed, single-use, expiring approval token** bound to
the specific `ProposedAction` id **and** the decision it authorizes, embedded in the card.
The callback is **fronted by APIM** (backend ADR-0074) with **Bot Framework / Teams channel
auth** on top. The token cannot be replayed against another action or another decision, and
expires.

**D3 — Idempotent.** The callback is idempotent on the `ProposedAction` id + the one-time
token. A double-tap, or a Teams redelivery of the same card action, is a **no-op** — it
resolves to "already decided" rather than re-running the transition.

**D4 — Approval fills the human-in-loop gate only.** A Teams approval satisfies the
**human-in-loop gate** of the gauntlet — it does **NOT** bypass the rest. Grounding-recheck,
hard-ceiling, idempotency, and egress gates **still run at execute time** (ADR-0107). A
**reject** refuses the sequence and logs the decision; it is never a silent drop.

## Consequences

### Security impact

A **signed, single-use, expiring token** bound to id + decision, behind **APIM** and Teams
channel auth, plus **the gauntlet still running at execute time**, means an approval cannot
become a bypass: even a valid approval re-enters the same gate sequence. **One sink** means
there is no second approval engine to drift out of sync with the cockpit's deny-whole /
no-rollback / consent-re-asserted invariants. Tokens are single-use, so a leaked or
redelivered card action cannot be replayed.

### Operational impact

Requires a backend callback endpoint + a Teams Adaptive Card template (the card render +
the inbound relay). No new decision-state store — the parked sequence remains the state; the
callback only transitions it.

### Future considerations

- Other approval channels (e.g. email approval) reuse the **same one-sink + signed
  single-use token** pattern rather than introducing a new decision engine.
- Token lifetime / replay-window tuning as the channel mix grows.
