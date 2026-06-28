# Stage 02 — redline-flag

**Job:** turn the grounded intake into one redline, one risk-clause flag set, and one
plain-language summary — each grounded in the deal, never a generic template.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Intake | `intake.md` (stage 01 output) | all | contract type + grounded context |
| Deal | silver `opportunity` · `okf:opportunity` | the linked deal | scope/value to weigh risk against |
| Standard clauses | `knowledge.search` (gold, cited) | our standard-clause baseline | judge deviation, propose redlines |
| Prior posture | `memory.recall` (captures, cited) | this counterparty's prior reviews | consistency with past positions |

## Process

1. `[sonnet]` Flag the risk clauses — liability, indemnity, term/auto-renew, IP,
   data/security, payment — and for each say **why** it bites and **how** it
   deviates from our standard. Weigh against the deal's scope/value.
2. `[sonnet]` Propose a redline per flagged clause (the change + a one-line
   rationale). Never invent terms or law; an unclear clause is a route-to-human note.
3. `[script]` Mark any clause needing a genuine legal judgment as
   **licensed-counsel-required** — flagged for a human, not opined on here.
4. `[sonnet]` Write a plain-language summary a non-lawyer can act on (top risks,
   recommended redlines, what must go to a human).

## Outputs

`review.md` — the risk-clause flags (with why + deviation), the proposed redlines,
the licensed-counsel-required list, and the plain-language summary.

## Audit

- [ ] Each standard risk category is addressed (flagged or explicitly clean)
- [ ] Every flag states why it bites and how it deviates; each has a proposed redline
- [ ] Genuine legal-judgment clauses marked licensed-counsel-required (none invented)
