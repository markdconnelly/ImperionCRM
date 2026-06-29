# Stage 02 — score

**Job:** compute the lead's new `lead_score` from the grounded signals and persist it
(internal, reversible — L2).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Signal brief | stage 01 output | all | the cited fit + engagement inputs to score |
| Score record | `` `okf:lead_score` `` | this lead | where the recomputed score is persisted |

## Process

1. `[script]` Apply the **rule-based v1 scoring model** (governed config) over the
   fit + engagement signals from the brief — a deterministic computation with one
   correct output per input. Predictive features (#389) are dormant → rules only.
2. `[script]` Persist the recomputed `lead_score` (value + the contributing-signal
   basis + as-of) to the lead's score record. This is an **internal, reversible
   write (L2)** — no external party hears from it.

## Outputs

`score.md` — the recomputed `lead_score`, the contributing-signal basis (which
fit/engagement inputs moved it), the rules-only note, and the persisted as-of.

## Audit

- [ ] Score computed only from stage-01 grounded signals (no new ungrounded input)
- [ ] Rule-based v1 model applied; predictive (#389) not assumed
- [ ] `lead_score` persisted with its contributing-signal basis + as-of
- [ ] Write is internal/reversible (L2) — nothing sent externally
