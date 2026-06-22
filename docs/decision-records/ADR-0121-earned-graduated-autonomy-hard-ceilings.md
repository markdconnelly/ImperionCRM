---
adr: 0121
title: "Earned / graduated autonomy with hard ceilings"
status: proposed
date: 2026-06-22
repo: frontend
summary: "Layer EARNED autonomy onto the 1-5 actuation dial (ADR-0109): an agent that builds a clean eval + approval track record on an action class auto-promotes its effective ADR-0055 tier ceiling one tier at a time, fully audited, and INSTANTLY demotes to the operator dial floor on a single miss. The always-surface data_class.always_gate classes (money / credentials / customer-facing, ADR-0118) are a HARD CEILING: the earned raise is discarded for them, so no track record can auto-cross a standing Mark-gate. resolveDispatch (ADR-0109 amendment) enforces effectiveCeiling = max(dial ceiling, earned tier), capped to the dial alone for always-gate classes."
tags: [meta, agents, security]
---

# ADR-0121: Earned / graduated autonomy with hard ceilings

> Number claimed at MERGE per system CLAUDE.md S10.3. The migration this ADR
> describes (0182, agent_earned_autonomy + agent_earned_transition) is authored
> against a placeholder and renumbered at merge.

| Field | Value |
|---|---|
| **Repo** | frontend (schema + engine + this ADR); backend owns the runtime promote/demote + dispatch enforcement |
| **Status** | Proposed |
| **Date** | 2026-06-22 |
| **Issue** | #1036 (agentic-OS contract close-out) |
| **Cross-references** | ADR-0109 (1-5 actuation dial + resolveDispatch), ADR-0107 (governed action / tool-grant plane, D4 dial), ADR-0055 (autonomy tiers T0-T3), ADR-0118 (data_class third axis + always_gate hard ceiling, #1034), ADR-0120 (eval feedback loop + golden harvest, #1037 - the track-record signal), migration 0158 (agent_action_autonomy), 0176 (agent_run routing record), 0175 (data_class + always_gate) |

## Problem

The agentic-OS contract (2026-06-21) locked **earned / graduated autonomy with HARD
CEILINGS**: autonomy is *earned* - an agent with a clean track record on an action class
should **auto-promote its tier**, fully audited, with an **instant demote on a miss** - BUT
the always-surface classes (money, customer-facing, prod-migration, X.0.0 - standing
Mark-gates) must be **capped at "always approve"**; no track record can auto-cross them.

ADR-0109 shipped the operator-set 1-5 dial (`agent_action_autonomy`) and `resolveDispatch`,
but the dial is **static**: an operator sets a level and it stays there. There is no
mechanism for an agent to *graduate* on a clean record, no instant demote on a miss, and no
enforced hard ceiling tying the earned dimension to the `data_class.always_gate` set
(ADR-0118). #1036 adds that earned dimension without weakening the gate.

## Context

- **The dial is the FLOOR; earned autonomy RAISES it.** The operator dial is a deliberate
  human setting and is always honored. Earned autonomy is a *separate, automatic* dimension
  that can only ever raise the effective ceiling - never lower it below the dial.
- **The track-record signal already exists.** ADR-0120 (#1037) harvests eval scores and
  approval outcomes per run. A "clean approval" = a human-approved run whose eval cleared the
  golden baseline (0.75). A "miss" = a rejection, a reverted/undone execution, or a hard eval
  fail. Earned autonomy is a pure state machine over that signal.
- **The hard ceiling is ALREADY data.** ADR-0118 / migration 0175 put `always_gate` on
  `data_class` and `ALWAYS_GATE_CLASSES` in `src/lib/security/data-class.ts` (money =
  `financial`, credentials = `security_credentials`, customer-facing = `client_pii`). #1036
  REUSES that set - it does not invent a parallel list (the contract's explicit instruction).
- **The backend is the authoritative enforcer.** As with the dial (ADR-0109) and the catalog
  (ADR-0107), repos don't share code: the FE expresses the pure engine + dispatch resolution;
  the backend (BE #250) mirrors it at runtime and writes the ledger.

## Decision

### D1 - Promotion: a clean streak steps up ONE tier
Per `(agent_key, action_class)` the system tracks a **clean approval streak**. A run counts as
clean when a human **approved** it AND its eval score is **>= `clean_eval_floor`** (default
0.75, the ADR-0120 golden baseline). When the streak reaches `promote_threshold` (default
**5** consecutive clean approvals), the **earned tier steps up one ADR-0055 tier** (null ->
T0 -> T1 -> T2 -> T3) and the streak resets. Promotion never crosses T3. Every promotion is
ledgered (`agent_earned_transition`). Unscored or low-scored approvals do not advance the
streak (no progress) and are not a miss (no demote).

### D2 - Demotion: a single MISS is instant, back to the dial floor
A **miss** is any of: a human **rejected** the proposed action, the action **executed but was
reverted/undone** within its window, or the run's **eval scored a hard FAIL**. A single miss
**instantly** sets the earned tier to `null` (back to the operator dial floor) and resets the
streak. The demotion is ledgered with the precise reason. There is no grace, no decay window -
earned autonomy is cheap to lose and must be re-earned from the floor.

### D3 - HARD CEILING: always-gate classes discard the earned raise (THE INVARIANT)
At dispatch the effective ceiling is computed per action's `data_class`:

```
effectiveCeiling = isAlwaysGate(dataClass) || unknown(dataClass)
                     ? dialCeiling                       # earned raise DISCARDED
                     : max(dialCeiling, earnedTier)      # earned raise applied
```

For an **always-gate** class (`financial` / `security_credentials` / `client_pii`, ADR-0118)
the earned tier is **discarded** - the action's routing collapses to the operator dial alone,
so **no track record can auto-cross the gate**. Fail-closed: an action whose `data_class` is
unknown is treated as always-gate (no earned raise), exactly as an uncatalogued action is
treated as the most-restrictive tier in `resolveDispatch`. The operator's own deliberate dial
setting on such a class is still honored (a human turning the dial up is not "earned"
autonomy); only the *auto-earned* raise is capped. This is the invariant: **no code path lets
the earned tier cross the always-gate hard ceiling.**

### D4 - Enforcement in resolveDispatch (extends ADR-0109)
`resolveDispatch(actionKind, agentKey, dials, earned?)` gains an optional `earned`
EarnedRecord. It computes `resolvedCeiling` from the dial (unchanged), then `effectiveCeiling`
per D3, and routes the action's ADR-0055 tier against `effectiveCeiling`. The `earned` arg is
OPTIONAL and only applies when its record keys the exact `(agent, class)` pair - so with no
earned record (every existing caller) behavior is **byte-for-byte unchanged** (backward
compatible). The resolution returns `earnedTier`, `effectiveCeiling`, and `hardGated` for the
run ledger + cockpit. The pure engine is `src/lib/agent/earned-autonomy.ts` (`applyOutcome`,
`clampCeilingForClass`, `earnedExecutesInline`).

### D5 - Schema + audit
Migration **0182** (RENUMBER AT MERGE) adds `agent_earned_autonomy` (per-pair earned tier +
streak + threshold + eval floor; **no `*` wildcard** - autonomy is earned per concrete agent,
never as a global default) and `agent_earned_transition` (append-only promote/demote ledger
with from/to tier, reason, triggering `agent_run`). Web role **reads** both (cockpit render);
the backend dispatcher **writes** both. No PII, no secrets (agent keys + class names + tier
labels + counters).

### D6 - Ownership / grants
Schema is front-end-owned (ADR-0042). Unlike the operator dial (which the FE slider writes
directly, ADR-0109 D4), the earned tables are **backend-write only** - the promotion engine
runs at dispatch in the authoritative runtime, so the FE has no write path (SELECT grant
only). The FE renders the track record; it never promotes/demotes.

## Options considered

1. **Earned tier as a separate dimension capped by always_gate (chosen).** Pro: reuses the
   ADR-0118 hard-ceiling set verbatim; the invariant is one short-circuit; backward compatible
   (optional arg). Con: two ceiling inputs (dial + earned) to reason about - mitigated by the
   single `clampCeilingForClass` expression.
2. **Mutate the operator dial level on a clean record.** Rejected: conflates the human's
   deliberate setting with auto-earned autonomy; loses the "instant demote to the *operator's*
   floor" semantics; an auto-bumped dial could silently cross an always-gate class.
3. **A global `*` earned default.** Rejected: a global earned tier is a back door around the
   per-agent track record - autonomy must be earned by a concrete agent on a concrete class.
4. **Decay / grace window on a miss.** Rejected for v1: the contract says *instant* demote on
   a miss (cheap to lose, re-earn from the floor). A softer policy is a later decision.

## Consequences

- **Safe by default + safe at the ceiling.** No earned record => today's dial behavior. The
  always-gate hard ceiling means money / credentials / customer-facing actions ALWAYS surface
  regardless of any track record - the standing Mark-gates are structurally un-crossable by
  automation. The standing test-pool rule (no live sends until Mark opens the stage) is
  unaffected; consent + the executor still gate every send.
- **Autonomy is earned and revocable.** An agent that performs well graduates automatically
  and audibly; one miss resets it. Every transition is on the ledger and (follow-up) the
  cockpit, so a human can always see *why* an agent has the autonomy it has.
- **Backend mirror required.** The runtime promote/demote + dispatch enforcement is BE #250's
  to mirror (filed alongside). Until deployed + trigger-synced (the standing backend deploy
  gotcha), the FE engine + schema are deploy-dormant - the tables exist, the dispatcher writes
  them once live.
- **Cockpit display is a follow-up.** This PR ships the tracer (schema + engine + dispatch
  wiring + the read data-layer + a pure track-record summary + this ADR + tests). The cockpit
  surface that renders current tier / track record / last transition (#1014) is a filed
  follow-up issue - the data layer (`earned-autonomy-data.ts`) + `summarizeTrackRecord` are
  the clean handoff.

This ADR ships **schema + pure engine + resolveDispatch enforcement + read data-layer + this
doc + tests**; the runtime (BE) and the cockpit display (FE follow-up) land separately.
