# Stage 01 — ingest-handoff

**Job:** identify the triggering cross-agent handoff and resolve its client.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Handoff event | the triggering `relationship.*` event (BE-W7 #437 bus) | full payload (source agent, event type, client id, entity refs) | the subject |
| Client | silver `account` · `okf:account` | the referenced account | resolve + confirm the client |
| Referenced entity | silver `interaction` · `okf:interaction` | the entity the handoff cites, if any | what the signal is about |

## Process

1. `[script]` Read the handoff: source agent, event type (`relationship.deal.won` /
   `…delivery.complete` / `…margin.risk` / …), client id, and any entity refs. Missing a
   resolvable client id → audit fail (no subject to aggregate).
2. `[script]` Resolve the client `account`; note the source agent + signal class (which of
   the seven handoff types this is, celeste.md §"The handoff hub").
3. `[haiku]` One-line restatement of the signal in plain terms (what just changed about this
   client) — the seed for the aggregation.

## Outputs

`handoff.md` — source agent, event type, resolved client id, the entity refs, and the
one-line signal restatement.

## Audit

- [ ] Resolved client `account` id stated (not blank)
- [ ] Source agent + signal class identified
- [ ] One-line signal restatement present (not the raw payload)
