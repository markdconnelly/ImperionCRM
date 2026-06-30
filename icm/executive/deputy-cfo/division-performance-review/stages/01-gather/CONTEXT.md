# Stage 01 — gather

**Job:** assemble, for each of Sterling's six reports, its activity, eval results,
autonomy rung, and the business outcome it owns into one un-judged gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Report activity | run ledger · `agent_run` (pg.read; horizontal, not an okf room) | this cycle, per report agent_key | what each report did / what stalled |
| Eval results | eval plane · `agent_eval_result` (pg.read; horizontal, not an okf room) | latest per report | quality signal (read only — adjudication is not here) |
| Autonomy rung | silver `agent_autopilot_policy` · `okf:agent_autopilot_policy` | current, per report | the dial each report runs at ("every tier reads its rung", ADR-0087) |
| Business outcome | silver `account` · `okf:account`, `opportunity` · `okf:opportunity`, `invoice` · `okf:invoice` | the movement attributable to each report | the outcome the report is measured against |
| Roster of reports | `../../../org.yaml` (reports_to: deputy-cfo) | Chase, Belle, Celeste, Vance, Audrey, Bridget | who is in scope |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | prior cycles' scorecards | recall, always cited |

## Process

1. `[script]` Resolve the six reports from the org tree (`reports_to: deputy-cfo`).
2. `[script]` For each report, pull its `agent_run` activity and latest
   `agent_eval_result` (read-only; the run ledger and eval plane are read via broad
   `pg.read`, not okf rooms) and its current rung from `agent_autopilot_policy`.
3. `[script]` Attach the business outcome it owns from silver (account +
   opportunity/invoice movement); id + figure only.
4. `[haiku]` Recall prior cycles' context per report via the retrieval tier; attach
   each item with its source reference.

## Outputs

`gather.md` — per-report rows (report agent_key · activity summary · eval signal ·
autonomy rung · the business outcome figure · cited recall), un-judged.

## Audit

- [ ] Exactly the six `reports_to: deputy-cfo` agents are in scope; no other agent
- [ ] Every report row states its current autonomy rung and its business-outcome figure
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no financial record written, no money moved, no dial changed
