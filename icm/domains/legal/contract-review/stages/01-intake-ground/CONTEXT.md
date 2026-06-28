# Stage 01 — intake-ground

**Job:** turn an inbound contract into one ingested, grounded review intake — the
paper attached to its counterparty and the deal it belongs to.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Contract | the inbound MSA/SOW handed over by Chase/Vance | full document | the subject |
| Counterparty | silver `account` · `okf:account` | this contract's counterparty | ground the review in the relationship |
| Deal | silver `opportunity` · `okf:opportunity` | the deal the contract attaches to | scope, value, and stage context |
| Prior reviews | `knowledge.search` / `memory.recall` (gold + captures, cited) | this counterparty / standard clauses | prior posture + the standard baseline |

## Process

1. `[script]` Identify the contract type (MSA / SOW) and the counterparty, and
   resolve it to an `account`. No counterparty resolvable → audit fail.
2. `[script]` Link the contract to its `opportunity` (the deal it attaches to);
   record `none` if it attaches to no open deal.
3. `[sonnet]` State the review scope in one short paragraph: what this contract
   covers, and what the paper does **not** settle (open questions for later stages).

## Outputs

`intake.md` — contract type, resolved counterparty (`account` id), linked deal
(`opportunity` id or `none`), and the review-scope summary.

## Audit

- [ ] Contract type identified and counterparty resolved to an `account` (else parked)
- [ ] Deal linked (`opportunity` id or `none` — blank is not valid)
- [ ] Review-scope summary names what the paper does not settle
