# Stage 01 — budget-context

**Job:** frame the account + its strategic plan, and receive Audrey's cost handoff.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Planning request | the triggering budget-cycle / QBR-follow-up / vCIO ask | full payload (client id, planning horizon) | the subject + the horizon |
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the referenced client | who the budget is for |
| Strategic plan | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | the roadmap the budget funds |
| Planned projects | silver `opportunity` · `okf:opportunity` | open/recent for this account | projects already in flight to budget for |
| Cost handoff | the Audrey (Finance) read-only handoff (plain input — Celeste reads no financials) | run-cost + cost-to-serve figures Audrey provides | the cost baseline for the budget |

## Process

1. `[script]` Read the request: resolve the client `account` and note the planning horizon.
   Missing a resolvable client id → audit fail (no subject to plan). Stay within THIS client
   (strict confidential boundary).
2. `[script]` Pull the account + contacts, the latest `strategic_business_review` (the
   roadmap), and open/recent `opportunity` rows (planned projects). An absent roadmap →
   audit fail (nothing to budget against).
3. `[script]` Receive Audrey's cost handoff as a plain input — record the run-cost /
   cost-to-serve figures Audrey provided. Celeste reads no financials directly; a missing
   cost line is a gap to state, never a number to invent.
4. `[haiku]` One-line frame of the budget context: the client, the horizon, and what the
   roadmap intends — the seed for the forecast.

## Outputs

`budget-context.md` — resolved client id, planning horizon, the roadmap summary, the
planned-project list, and Audrey's cost figures as received (each tagged as an Audrey
handoff input).

## Audit

- [ ] Resolved client `account` id stated (not blank)
- [ ] Strategic roadmap present (an absent roadmap parks the run)
- [ ] Audrey's cost figures recorded as a handoff input (no figure invented; gaps stated)
- [ ] Only this client's data was read (no cross-client leakage)
