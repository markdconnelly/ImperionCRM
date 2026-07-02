# Stage 01 — gather

**Job:** assemble the cycle's dial state, conformance / gate outcomes, and Platform
run-ledger and handoff signals into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Autonomy dial | `autopilot_policies` · `okf:agent_autopilot_policy` | current state + recent changes | the control surface being watched for drift |
| Platform run-ledger | `agent_run` (run-ledger, via `pg.read`) | recent Vera runs | what Platform has already observed |
| Handoff signals | `relationship.*` (handoff bus, via `pg.read`) | open Platform / conformance signals | prior drift findings in motion |
| Conformance outcomes | eval / gate result records (via `pg.read`) | recent gate + conformance failures | where the workforce is out of conformance |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's agents in scope | recall, always cited |

## Process

1. `[script]` Pull the autonomy-dial state and its recent changes into a flat list
   keyed by agent/workflow. Read-only; never write.
2. `[script]` Read Vera's run-ledger (`agent_run`) and the `relationship.*` handoff
   bus via `pg.read`; attach prior Platform observation activity by agent, id only.
3. `[script]` Pull recent conformance / gate outcomes recorded on the platform;
   attach each failure by agent/workflow, id only.
4. `[haiku]` Recall prior context for the cycle's agents via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of conformance / drift signals keyed by
agent/workflow, with the dial state per agent, the prior Platform activity, and cited
recall items.

## Audit

- [ ] Every signal names its agent/workflow and its source record id
- [ ] Prior Platform activity is attached by id (run-ledger / handoff bus), no value invented
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No client PII reproduced — everything by reference (id/location)
- [ ] Read-only — no config changed, no dial touched, no fix applied
