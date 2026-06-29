# Stage 01 — gather

**Job:** assemble the cycle's Partnerships activity, partner/deal/MDF/payout reads,
and the accounts in scope into one un-ranked gather record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Partnerships run ledger | `agent_run` (run ledger, via pg.read) | Bridget's runs this cycle | what Partnerships did + outcomes |
| Handoff signals | `relationship.*` handoff bus (via pg.read) | Partnerships-tagged signals this cycle | live partner activity / asks raised |
| Partners | silver `partner` · `okf:partner` | active channel/alliance partners | who the economics are for |
| Partner deals | silver `partner_deal` · `okf:partner_deal` | open + recently-closed co-sell/referral | contribution + attribution basis |
| MDF | silver `partner_mdf` · `okf:partner_mdf` | requested → spent this period | spend vs ROI inputs (money, always-gated at Bridget) |
| Referral payouts | silver `referral_payout` · `okf:referral_payout` | pending → paid this period | payout economics (money, always-gated at Bridget) |
| Accounts in scope | silver `account` · `okf:account` | accounts behind the deals | who the deals landed on |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this cycle's partner themes | recall, always cited |

## Process

1. `[script]` Read the Partnerships run ledger (`agent_run`) and the
   `relationship.*` handoff bus via pg.read; flatten to a list of Bridget's
   activity and raised asks this cycle. Read-only; never write.
2. `[script]` Pull the partner/deal/MDF/payout reads into a flat list keyed by
   theme (contribution, MDF, payout). Read-only.
3. `[script]` Resolve referenced accounts from silver; attach id + name only.
4. `[haiku]` Recall prior context for the cycle's partner themes via the retrieval
   tier; attach each item with its source reference.

## Outputs

`gather.md` — a flat, un-ranked list of partner-economics signals tagged by theme
(contribution / MDF / payout), with the ledger + handoff activity, the account ids
in scope, and cited recall items.

## Audit

- [ ] Every signal carries a theme tag (contribution / MDF / payout)
- [ ] Run-ledger / handoff-bus items are labeled as such (not as OKF rooms)
- [ ] Every account reference states its id
- [ ] Every recall item carries a source reference; no uncited claim
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked
