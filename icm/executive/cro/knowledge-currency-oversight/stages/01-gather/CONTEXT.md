# Stage 01 — gather

**Job:** assemble the cycle's knowledge-freshness reads, OKF coverage picture,
identity-spine health, and Knowledge run-ledger and handoff signals into one
un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Knowledge objects | gold knowledge records (via `pg.read`) | freshness stamps + source references | what the agents reason on, and how old it is |
| Recall usage | retrieval-usage signals (via `pg.read`) | recent recalls per knowledge object | which stale items are *actively used* |
| OKF coverage | semantic-layer concept files vs entity change stamps (via `pg.read` / retrieval) | concept timestamps vs last shape change | where the meaning layer lags the schema |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | dangling / conflicting xrefs | join breaks that make recall untrustworthy |
| Knowledge run-ledger | `agent_run` (run-ledger, via `pg.read`) | recent Alivia runs | what Knowledge has already verified |
| Handoff signals | `relationship.*` (handoff bus, via `pg.read`) | open knowledge signals | prior findings in motion |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's knowledge areas | recall, always cited |

## Process

1. `[script]` Pull knowledge-object freshness (created/updated stamps, source
   references) into a flat list; attach recall-usage counts where recorded.
   Read-only; never write.
2. `[script]` Compare OKF concept timestamps against their entities' last shape
   change; list every lagging concept, id/path only.
3. `[script]` Check identity-spine health on `entity_xref`: dangling references and
   conflicting active mappings; list each break by id.
4. `[script]` Read Alivia's run-ledger (`agent_run`) and the `relationship.*`
   handoff bus via `pg.read`; attach prior Knowledge activity by item, id only.
5. `[haiku]` Recall prior context for the cycle's knowledge areas via the retrieval
   tier; attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of staleness / coverage / spine signals keyed by
knowledge item or entity, with freshness stamps, usage counts, prior Knowledge
activity, and cited recall items.

## Audit

- [ ] Every staleness signal names its knowledge object / concept and its freshness stamp
- [ ] Usage counts attached only where recorded — never estimated
- [ ] Every spine break names the xref ids involved
- [ ] Prior Knowledge activity is attached by id (run-ledger / handoff bus), no value invented
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] No client PII reproduced — everything by reference (id/location)
- [ ] Read-only — nothing rewritten, nothing re-vectorized
