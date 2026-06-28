# Stage 02 — score-quality

**Job:** score each in-scope ticket on quality, CSAT-risk, and SLA-adherence.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Scope record | stage 01 `scope.md` | all in-scope tickets | the subjects to score |
| Ticket detail | silver `ticket` · `okf:ticket` | resolution text + timeline for each scoped ticket | the evidence to score against |

## Process

1. `[sonnet]` For each ticket, score **quality** 1–5 (was the work done right per
   the resolution + timeline) with one sentence of grounded reasoning.
2. `[sonnet]` Score **CSAT-risk** `low | medium | high` (is the client likely
   unhappy — reopens, churned-back-and-forth, terse/incomplete resolution) with one
   sentence of grounded reasoning.
3. `[script]` Score **SLA-adherence** `met | breached | unknown` from the SLA
   target vs actual in the scope record (deterministic clock comparison).
4. `[sonnet]` Flag low confidence + name anything in the record you could not
   reconcile. A score you cannot ground is not a score — say so rather than guess.

## Outputs

`scores.md` — one row per ticket: id, account (by reference), quality 1–5 +
reasoning, CSAT-risk + reasoning, SLA-adherence, confidence note. PII reported **by
reference** — never the verbatim resolution text or client identifiers.

## Audit

- [ ] Every in-scope ticket has all three scores (quality, CSAT-risk, SLA-adherence)
- [ ] Each subjective score (quality, CSAT-risk) carries one sentence of grounded
      reasoning; `unknown`/low-confidence states a reason
- [ ] No verbatim PII / client identifier in the output (audit-by-reference)
