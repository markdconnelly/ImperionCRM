# Stage 01 — gather

**Job:** assemble the cycle's cross-report compliance outputs and the tenants in
scope into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Division run ledger | `agent_run` (via pg.read) | Grace/Cyrus/Osiris runs this cycle | what the reports actually did |
| Handoff bus | `relationship.*` handoff signals (via pg.read) | division activity this cycle | evidence/gap/hygiene signals between agents |
| Posture snapshots | silver `posture_snapshot` · `okf:posture_snapshot` | current snapshot per pillar | the control-state baseline |
| Tenant posture | silver `tenant_posture` · `okf:tenant_posture` | per-tenant rollup | per-client compliance drift |
| Posture policy / golden | silver `posture_policy` · `okf:posture_policy` | active goldens | the control targets to measure against |
| Accounts in scope | silver `account` · `okf:account` | tenants behind the findings | who the compliance state is for |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's audit/compliance themes | recall, cited by reference |

## Process

1. `[script]` Pull the run ledger and the handoff-bus signals into a flat list
   keyed by report (GRC evidence / SOC coverage / identity hygiene). Read-only;
   never write.
2. `[script]` Pull the posture rooms (snapshots, per-tenant drift, policy
   goldens) into the same flat list, keyed by framework/tenant. Read-only.
3. `[script]` Resolve referenced accounts from silver; attach id only. No
   client PII, no secret values — reference by id.
4. `[haiku]` Recall prior audit/compliance context via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of compliance signals keyed by report and
framework/tenant, with the account ids in scope and cited recall items.
Reference only; no PII, no secrets.

## Audit

- [ ] Every signal carries a report (Grace/Cyrus/Osiris) and/or framework/tenant key
- [ ] Every account reference states its id (audit by reference)
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No client PII, no secret values present
- [ ] Read-only — no control changed, nothing written
