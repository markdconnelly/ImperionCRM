# Stage 01 — ground

**Job:** turn a partner-sourced signal into one grounded context record — the
partner, the account, and (if opened) the opportunity, each cited with an as-of.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Partner signal | the triggering row (partner registration / partner-influenced lead / co-sell notification) | full payload | the subject |
| Partner | silver `partner` · `okf:partner` | match candidate by name/external_ref | identify the registering partner |
| Registered deals | silver `partner_deal` · `okf:partner_deal` | deals on this partner + this account | prior-state for conflict/attribution |
| Account | silver `account` · `okf:account` | the target client by name/domain | the co-sell target |
| Opportunity | silver `opportunity` · `okf:opportunity` | the opportunity if already opened | the close seam |

## Process

1. `[script]` Extract identity fields (partner name/external_ref, account
   name/domain, opportunity ref if present, deal-type hint, message text) from the
   payload's known keys. No partner identifier at all → audit fail.
2. `[script]` Look up the partner by name/external_ref; the account by name/domain;
   the opportunity by ref if present. Record each match (id) or `unresolved`,
   **with the as-of of each read** (A5).
3. `[sonnet]` Summarize the grounded context in two sentences: who the partner is,
   what account/opportunity is in play, and what is still unknown. State unknowns
   plainly — do not infer a partner or an account that did not resolve.

## Outputs

`ground.md` — the resolved partner id (or `unresolved`), account id (or `new`/
`unresolved`), opportunity id (or `none`), each with its as-of, plus the two-sentence
context summary.

## Audit

- [ ] A partner identifier was present in the signal (else the run parks)
- [ ] Each lookup states a matched id or `unresolved`/`new`/`none` (blank is not valid)
- [ ] Each grounded fact carries an as-of; no inferred partner or account
