# Stage 01 — intent-confirm

**Job:** confirm the inbound engagement is sales-intent and dedupe its author to a contact/lead.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Engagement | the triggering social `interaction` · `okf:interaction` | full payload (channel, public/DM, text, author handle) | the subject |
| Existing contacts | silver `contact` / `account` · `okf:contact` `okf:account` | match by handle/name/email | dedupe |
| Lead score | silver `lead_score` · `okf:lead_score` | this author if known | corroborate intent/priority |
| Consent / opt-out | consent ledger · `okf:consent_event` | this author's entries | a stop/opt-out ends the run |

## Process

1. `[script]` Check the consent ledger for a stop/opt-out from this author → if present, end
   the run immediately (no reply, ever). This outranks everything.
2. `[sonnet]` Confirm intent class: `sales` | `brand-engagement` | `support` | `spam`.
   Only `sales` continues; others end with a routing note (Belle / Felix / drop).
3. `[script]` Dedupe: match the author to a silver contact by handle/name/email → link, else
   mark `new`. Note whether this is a public comment or a private DM (drives stage 03).

## Outputs

`intent.md` — intent class, channel + public/DM flag, dedupe result (matched contact id or
`new`), and any opt-out finding. Non-`sales` ends the run with the routing target.

## Audit

- [ ] No active stop/opt-out for this author (else the run ended at step 1)
- [ ] Exactly one intent class present
- [ ] Channel + public/DM flag stated; dedupe states a contact id or `new`
