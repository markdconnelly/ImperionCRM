# Stage 01 — gather

**Job:** assemble the cycle's problems, known errors, recurring-ticket reads, and the
Problem/NOC run-ledger / handoff signals into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Problems | silver `problem` · `okf:problem` | open + recently closed investigations | investigation state / staleness |
| Known errors | silver `known_error` · `okf:known_error` | the register + workaround states | known errors still generating tickets |
| Tickets | silver `ticket` · `okf:ticket` | recent tickets on repeat CIs / symptoms / accounts | the recurrence signal |
| Devices | silver `device` · `okf:device` | CIs behind the repeat tickets | what the recurrence clusters on |
| Problem/NOC run-ledger | `agent_run` (run-ledger, via `pg.read`) | recent Sage / Ozzie runs | what Problem/NOC has already acted on |
| Handoff signals | `relationship.*` (handoff bus, via `pg.read`) | open Problem/NOC signals | prior investigation / tuning in motion |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's clusters | recall, always cited |

## Process

1. `[script]` Pull the open problems with their investigation state and age, and the
   known-error register with workaround states, into flat lists keyed by problem /
   known-error id. Read-only; never write.
2. `[script]` Pull the recent tickets that repeat — same CI, same symptom class, or
   same account — and resolve the devices behind them; attach id + name only.
3. `[script]` Read the Problem/NOC run-ledger (`agent_run`) and the `relationship.*`
   handoff bus via `pg.read`; attach any prior Sage/Ozzie activity by problem /
   cluster, id only.
4. `[haiku]` Recall prior context for the cycle's clusters via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked record of open problems (with age and state), known
errors, and repeat-ticket signals keyed by CI/symptom/account, with the prior
Problem/NOC activity and cited recall items.

## Audit

- [ ] Every problem and known error names its id and investigation/workaround state
- [ ] Every repeat-ticket signal names its ticket ids and the CI/account it clusters on
- [ ] Prior Problem/NOC activity is attached by id (run-ledger / handoff bus), no value invented
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no problem opened, advanced, or closed; no monitor touched
- [ ] No send/write/actuation occurred — Dexter delegated or parked
