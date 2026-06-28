# Stage 01 — gather

**Job:** assemble the cycle's conformance/quality/telemetry/control-drift signals
and the accounts in scope into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Autonomy dial | silver `agent_autopilot_policy` · `okf:agent_autopilot_policy` | every tier's current rung | control posture — who is on `auto` |
| Posture snapshots | silver `posture_snapshot` · `okf:posture_snapshot` | current snapshot per pillar | telemetry/conformance baseline |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | resolution/DQ-gate health | data-quality + resolution drift |
| Accounts in scope | silver `account` · `okf:account` | accounts behind the findings | who the risk is for |
| Conformance / quality signals | run ledger · `agent_run` + eval/quality telemetry | current cycle | conformance + service-quality drift |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's drift themes | recall, cited by reference |

## Process

1. `[script]` Pull the autonomy dial, posture snapshots, identity-spine health, and
   conformance/quality telemetry into a flat list keyed by area.
2. `[script]` Resolve referenced accounts from silver; attach id only. No client
   PII, no secrets — reference by id.
3. `[haiku]` Recall prior context for the cycle's drift themes via the retrieval
   tier; attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of conformance/quality/telemetry/control-drift
signals keyed by area, with the account ids in scope and cited recall items.
Reference only; no PII, no secrets.

## Audit

- [ ] Every signal carries an area tag (conformance / quality / telemetry / control-drift)
- [ ] Every account reference states its id (audit by reference)
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No client PII, no secrets present
