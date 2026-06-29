# Stage 01 — scan-contracts

**Job:** turn the in-scope counterparties and deals into one grounded watch-list —
the contracts with upcoming renewals or standing obligations, each attached to its
counterparty and deal.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Counterparties | silver `account` · `okf:account` | in-scope counterparties for this scan | the relationships whose contracts are watched |
| Deals | silver `opportunity` · `okf:opportunity` | the deals contracts attach to | scope/value/stage context per contract |
| Contract terms | `knowledge.search` (gold, cited) | renewal/obligation terms on record | the verified renewal + standing-obligation facts |
| Prior watch posture | `memory.recall` (captures, cited) | this counterparty's prior watch notes | consistency with past scans + known obligations |

## Process

1. `[script]` Enumerate the in-scope counterparties and resolve each to an `account`;
   link each watched contract to its `opportunity` (or record `none`).
2. `[haiku]` For each counterparty/deal, read the contract terms on record and pull
   the renewal and standing-obligation entries — verbatim from the source, cited.
   A term not on record is recorded as **unverifiable**, never inferred.
3. `[sonnet]` Assemble the watch-list: one entry per contract with an upcoming
   renewal or a standing obligation, grounded in its counterparty/deal, with a short
   note of what the record does **not** settle. An empty scan is reported as empty —
   never padded with invented entries.

## Outputs

`watchlist.md` — one entry per watched contract: resolved counterparty (`account`
id), linked deal (`opportunity` id or `none`), the cited renewal/obligation terms (or
`unverifiable`), and what the record does not settle. Empty if the scan finds nothing.

## Audit

- [ ] Every entry resolves to an `account` (and an `opportunity` id or explicit `none`)
- [ ] Every renewal/obligation term is cited to a source, or marked `unverifiable` (none invented)
- [ ] An empty scan is reported as empty — no fabricated entries
