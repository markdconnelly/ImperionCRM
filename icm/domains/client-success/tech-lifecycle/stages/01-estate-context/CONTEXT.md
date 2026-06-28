# Stage 01 — estate-context

**Job:** assemble the lifecycle-review picture for the client, folding in the asset/CMDB
facts that arrive as a service/Felix handoff.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Lifecycle cue | the triggering `relationship.lifecycle.*` cue / handoff | full payload (client id, asset/CMDB facts, source) | the subject + the asset evidence |
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the client record | who the relationship is with |
| Transaction | silver `opportunity` · `okf:opportunity` | open/recent for this account | renewal + expansion context |
| Engagement + service | silver `interaction` / `ticket` · `okf:interaction` `okf:ticket` | recent history for this account | service-friction signals on the estate |
| Strategic record | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | the client's own roadmap / standards |

> **Asset/CMDB facts are NOT a direct read.** The CMDB device/cloud-asset rooms are not in
> client-success's rooms. The estate's lifecycle detail arrives as **service-domain / Felix
> handoff context** in the triggering cue — treat it as supplied evidence, name its source,
> and never ground a stage on the CMDB device/cloud-asset concepts (that scope is not granted).

## Process

1. `[script]` Resolve the client `account`. Read the contacts, open/recent opportunities,
   recent interactions + tickets, and the latest `strategic_business_review`. Stay within
   THIS client (strict confidential boundary — never read across clients).
2. `[script]` Extract the asset/CMDB facts from the handoff payload (EOL dates, ages, OS
   versions, warranty, named-asset incident links) and tag each with its source = handoff.
   If the payload carries no asset picture, record "estate unknown" — do not reconstruct one.
3. `[sonnet]` Assemble the estate-context picture: the relationship + service standing plus
   the supplied asset evidence, each point citing its source row or marked `handoff`. No new
   outreach.

## Outputs

`estate-context.md` — the resolved client, the relationship + service + strategic standing,
and the supplied asset/CMDB evidence (each item sourced; handoff-sourced items marked).
States "estate unknown" if no asset picture was supplied.

## Audit

- [ ] Only this client's data was read (no cross-client leakage)
- [ ] No CMDB device/cloud-asset concept grounded — asset facts come from the handoff, marked as such
- [ ] Each point cites a source row or is marked `handoff` (no unsourced assertion)
- [ ] An absent asset picture is recorded as "estate unknown" (not fabricated)
