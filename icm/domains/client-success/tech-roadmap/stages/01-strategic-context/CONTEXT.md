# Stage 01 — strategic-context

**Job:** frame the client's current state vs target state from the account, the strategic
record, and the open transactions.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the client record | who the plan is for |
| Strategic record | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | the standing strategic picture (current state) |
| Transactions | silver `opportunity` · `okf:opportunity` | open/recent for this account | renewal + expansion context shaping target state |

> Asset / lifecycle facts (CMDB, device end-of-life) arrive as a service / Felix handoff,
> and security posture as a Vera handoff — plain inputs to your framing. This stage does
> not read the CMDB or the posture tier; it frames the plan from the rooms above plus
> those handoffs.

## Process

1. `[script]` Resolve the client `account` + contacts. Pull the latest
   `strategic_business_review` and the open/recent `opportunity` rows for this account.
   Stay within THIS client (strict confidential boundary — never read across clients).
   No resolvable client → audit fail (no subject to plan).
2. `[sonnet]` Frame **current state** (the standing strategic picture + service/posture
   context arriving as handoffs) and **target state** (the multi-year outcome a sound
   posture would deliver). Cite the source rows / handoffs behind each point — measured,
   not assumed.

## Outputs

`strategic-context.md` — the resolved client, the current-state framing, and the
target-state framing, each citing its source row or handoff.

## Audit

- [ ] Resolved client `account` id stated (not blank)
- [ ] Only this client's data was read (no cross-client leakage)
- [ ] Current state and target state are both framed, each citing a source row or handoff
