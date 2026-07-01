# Stage 01 — gather

**Job:** assemble the cycle's change calendar, freeze windows, rollback plans, the
standard-change catalog, and the Change run-ledger / handoff signals into one
un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Change requests | silver `change_request` · `okf:change_request` | open / scheduled this cycle (typed standard\|normal\|emergency) | the change calendar |
| Freeze windows | silver `change_freeze` · `okf:change_freeze` | active + upcoming windows | overlap detection |
| Rollback plans | silver `rollback_plan` · `okf:rollback_plan` | plans for the in-flight changes + sign-off state | rollback-gap detection |
| Standard-change catalog | silver `standard_change_catalog` · `okf:standard_change_catalog` | the pre-authorized template library | off-catalog detection |
| Change run-ledger | `agent_run` (run-ledger, via `pg.read`) | recent Marshall runs | what Change/Release has already acted on |
| Handoff signals | `relationship.*` (handoff bus, via `pg.read`) | open Change signals | prior change work in motion |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's changes | recall, always cited |

## Process

1. `[script]` Pull the open/scheduled change requests — type, risk, window, status —
   into a flat list keyed by change id. Read-only; never write.
2. `[script]` Pull the active and upcoming freeze windows, the rollback plans (with
   sign-off state) for the in-flight changes, and the standard-change catalog
   entries; attach by change id where referenced.
3. `[script]` Read the Change run-ledger (`agent_run`) and the `relationship.*`
   handoff bus via `pg.read`; attach any prior Marshall activity by change id, id
   only.
4. `[haiku]` Recall prior context for the cycle's changes via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of in-flight changes keyed by change id, with
the freeze windows, each change's rollback-plan state, the catalog references, the
prior Change activity, and cited recall items.

## Audit

- [ ] Every change names its change id, type, and window
- [ ] Freeze windows, rollback-plan states, and catalog references attached where they exist, no state invented
- [ ] Prior Change activity is attached by change id (run-ledger / handoff bus), no value invented
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no change approved, scheduled, or modified
- [ ] No send/write/actuation occurred — Dexter delegated or parked
