# Stage 02 — aggregate-360

**Job:** fold the new signal into the whole-account client-360 picture.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Handoff | `handoff.md` (stage 01 output) | full | the new signal + resolved client |
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the client record | who the relationship is with |
| Transaction | silver `opportunity` · `okf:opportunity` | open/recent for this account | deal + renewal + expansion context |
| Engagement + service | silver `interaction` / `ticket` · `okf:interaction` `okf:ticket` | recent history for this account | sentiment + service-pattern signals |
| QBR substrate | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | the standing strategic picture |

## Process

1. `[script]` Pull the account + contacts, open/recent opportunities, recent interactions +
   tickets, and the latest `strategic_business_review` for the resolved client. Stay within
   THIS client (strict confidential boundary — never read across clients).
2. `[sonnet]` Assemble the client-360: the standing picture + **what the new signal changes**
   (a new risk, a strengthened relationship, an expansion opening, a service-pattern trend).
   Cite the source rows behind each point — measured, not assumed.

## Outputs

`client-360.md` — the aggregated picture: relationship summary, open transactions, engagement
+ service trend, QBR context, and the delta the new handoff adds. Every point cites its source.

## Audit

- [ ] Only this client's data was read (no cross-client leakage)
- [ ] The new signal's delta vs the standing picture is explicit
- [ ] Each point cites a source row (no unsourced assertion)
