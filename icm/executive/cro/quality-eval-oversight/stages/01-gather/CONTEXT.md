# Stage 01 — gather

**Job:** assemble the cycle's eval-plane reads, Service-Quality run-ledger and handoff
signals, and the accounts behind client-touching quality signals into one un-ranked
gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Golden cases | `agent_eval_case` (via `pg.read`) | per module, with tags/tier | what the workforce is measured against |
| Eval runs | eval-run result records (via `pg.read`) | recent runs per module | measured pass rates |
| Baselines | `eval/baselines.json` (platform copy, via `pg.read` / retrieval) | per module | the bar each module must clear |
| Accounts in scope | silver `account` · `okf:account` | accounts behind client-touching quality signals | who a quality slip affects |
| Service-Quality run-ledger | `agent_run` (run-ledger, via `pg.read`) | recent Tess runs | what Service Quality has already judged |
| Handoff signals | `relationship.*` (handoff bus, via `pg.read`) | open quality signals | prior findings in motion |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's modules | recall, always cited |

## Process

1. `[script]` Pull the golden cases and recent eval-run results per module into a
   flat list; attach each module's baseline. Read-only; never write.
2. `[script]` List agents/modules with no golden cases, or none tagged per
   always-gate class — the raw coverage-gap candidates.
3. `[script]` Read Tess's run-ledger (`agent_run`) and the `relationship.*` handoff
   bus via `pg.read`; attach prior Service-Quality activity by module, id only.
4. `[script]` Resolve client-touching quality signals to their accounts from silver;
   attach id + name only.
5. `[haiku]` Recall prior context for the cycle's modules via the retrieval tier;
   attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of eval scores and quality signals keyed by
module, with baselines attached, the raw coverage-gap candidates, prior
Service-Quality activity, and cited recall items.

## Audit

- [ ] Every score names its module and its case/run record id
- [ ] Every module's baseline is attached where one exists; a missing baseline is listed as a gap, not invented
- [ ] Prior Service-Quality activity is attached by id (run-ledger / handoff bus), no value invented
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No client PII reproduced — accounts by id + name only
- [ ] Read-only — no golden edited, no baseline moved, no run re-scored
