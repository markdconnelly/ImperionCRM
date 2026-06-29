# Stage 05 — summary

**Job:** write the partnership work-note recording what was registered, the
attribution, and the routing decision — attributed up the chain.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Ground record | stage 01 `ground.md` | all | the resolved context |
| Attribution | stage 02 `attribution.md` | all | the partner + contribution |
| Routing | stage 03 `routing.md` | all | deal type + conflict status |
| Hand-off | stage 04 `handoff.md` | all | the routing outcome |

## Process

1. `[script]` Assemble the run facts: partner id, account, deal type, attribution
   summary, channel-conflict status, hand-off outcome (approved / parked).
2. `[sonnet]` Write a concise partnership work-note (three to four sentences) — the
   partnership touch, what was registered, where it routed, and any open
   human-decision (a conflict or `needs-human` attribution still pending).

## Outputs

`summary.md` — the partnership work-note (the run product is a Postgres row, not a
committed file). No external send (ADR-0058); this is an internal record.

## Audit

- [ ] The note states the partner, deal type, account, and routing outcome
- [ ] Any open human-decision (conflict / `needs-human`) is named, not dropped
- [ ] No client/partner PII beyond what the record already holds; no fabricated detail
