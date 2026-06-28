# Stage 01 — need-context

**Job:** frame the client need from the account + standing strategic record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Vendor handoff | the triggering payload (often a Vance handoff, #1398) | full (need ref, client id, vendor/solution facts: products, pricing, terms, EOL/risk) | the trigger + the given vendor facts |
| Client | silver `account` · `okf:account` | the referenced account | resolve + confirm the client |
| Stakeholders | silver `contact` · `okf:contact` | contacts for this account | who the need is for / who decides |
| Strategic record | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | the standing need, roadmap, and constraints |

## Process

1. `[script]` Read the handoff: the need reference, client id, and the given vendor/solution
   facts (products, pricing, terms, EOL/risk). Missing a resolvable client id → audit fail
   (no subject to advise). Take the vendor facts as given — never re-derive them.
2. `[script]` Resolve the client `account` + the relevant `contact` stakeholders. Stay
   within THIS client (strict confidential boundary — never read across clients).
3. `[sonnet]` Frame the need from the strategic record + the account context: what the
   client is actually trying to solve, what they already run, and the constraints that
   matter. The vendor/Pax8 facts from the handoff are context, not the subject — the need
   is the subject.

## Outputs

`need-context.md` — resolved client id, the framed client need (in the client's terms), the
relevant constraints + existing-stack context, and the given vendor/solution facts carried
forward verbatim from the handoff (attributed to Vance, not re-derived).

## Audit

- [ ] Resolved client `account` id stated (not blank)
- [ ] The client need is framed from the record, not assumed
- [ ] Vendor/solution facts are carried as the handoff's, not re-derived here
- [ ] Only this client's data was read (no cross-client leakage)
