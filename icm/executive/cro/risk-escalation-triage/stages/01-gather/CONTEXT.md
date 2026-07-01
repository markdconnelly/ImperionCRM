# Stage 01 — gather

**Job:** assemble the open escalations, their subject and posture context, and the
prior activity on each into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Open escalations | `relationship.*` (handoff bus, via `pg.read`) | open risk signals / quarantine flags | the triage queue's raw material |
| Watcher run-ledgers | `agent_run` (run-ledger, via `pg.read`) | recent Vera/Tess/Alivia runs | who already observed what |
| Subjects | silver `account` · `okf:account` + silver `entity_xref` · `okf:entity_xref` | subjects behind each escalation | who/what each escalation is about |
| Posture context | silver `posture_snapshot` · `okf:posture_snapshot` | subjects with a posture dimension | the security-posture backdrop where relevant |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this batch's subjects | recall, always cited |

## Process

1. `[script]` Pull the open escalations from the handoff bus into a flat list, one
   row per escalation, id and emitter attached. Read-only; never write.
2. `[script]` Read the watchers' run-ledgers (`agent_run`) via `pg.read`; attach
   prior observation activity per subject, id only.
3. `[script]` Resolve each escalation's subject via silver (`account` /
   `entity_xref`); attach id + name only. Attach the posture snapshot reference
   where the escalation has a posture dimension.
4. `[haiku]` Recall prior context for the batch's subjects via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked escalation list, each item with its signal id and
emitter, its subject (id + name), its posture reference where relevant, prior watcher
activity, and cited recall items.

## Audit

- [ ] Every escalation carries its signal id and emitter
- [ ] Every escalation's subject is resolved by id + name only — no client PII beyond that
- [ ] Prior watcher activity is attached by id (run-ledger / handoff bus), no value invented
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — nothing contained, corrected, or quarantined
