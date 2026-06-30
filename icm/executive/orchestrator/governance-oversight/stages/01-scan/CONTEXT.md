# Stage 01 — scan

**Job:** assemble the cycle's autonomy-posture reads — dial state, the gate
backlog with ages, kill-switch state, and recent run health — plus the prior
cycle's recall into one un-ranked scan record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Dial / autopilot state | agent-ops ledger (`autopilot_policies` dial state) via `pg.read` | every workflow's current rung + draft/auto mode | where each agent's `auto` dial sits |
| Pending-approval (gate) backlog | agent-ops gate queue via `pg.read` | open gated items + each item's age | the human-approval queue and its aging |
| Kill-switch state | agent-ops ledger (kill-switch table) via `pg.read` | agent / division / platform scope | whether autonomy is revoked anywhere (engaged/partial/clear) |
| Agent-run health | agent-ops ledger (`agent_run`) via `pg.read` | recent cycle — error/stuck counts | run-ledger anomalies (error spikes, stuck runs) |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | the prior cycle's oversight brief + related context | recall, always cited |

## Process

1. `[script]` Read each workflow's current autonomy rung + draft/auto mode from the
   dial state. Read-only; never write.
2. `[script]` Read the pending-approval (gate) backlog and compute each item's age
   (cadence/date math). Read-only.
3. `[script]` Read the kill-switch state across agent / division / platform scope —
   record engaged, partial, or clear. Read-only.
4. `[script]` Read recent `agent_run` health — error counts and stuck/long-running
   runs for the cycle. Read-only.
5. `[haiku]` Recall the prior cycle's oversight brief and related context via the
   retrieval tier; attach each item with its source reference. A miss is recorded
   as "no recall," never filled with a guess.

## Outputs

`scan.md` — a flat, un-ranked record of the dial state per workflow, the gate
backlog with ages, the kill-switch state per scope, the run-ledger health counts,
and cited recall items (or an explicit "no recall"). No ranking, no assessment.

## Audit

- [ ] Dial state, gate backlog (with ages), kill-switch state, and run-ledger health all read; any unreadable source recorded as a gap, never guessed
- [ ] Every recall item carries a source reference; a miss is recorded as "no recall," not a guess
- [ ] Read-only — no dial flipped, no kill-switch toggled, nothing actuated, nothing written outside the run record
- [ ] Internal posture only — no client account/contact/ticket or other client data pulled (agent-ops ledger, not OKF silver)
- [ ] No ranking or assessment performed at this stage — that is stage 02
