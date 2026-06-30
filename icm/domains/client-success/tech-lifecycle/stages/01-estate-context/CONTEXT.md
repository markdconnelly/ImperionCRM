# Stage 01 — estate-context

**Job:** assemble the lifecycle-review picture for the client, reading the asset/CMDB facts
directly from the CMDB silver rooms.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Lifecycle cue | the triggering `relationship.lifecycle.*` cue | client id + the review window | the subject |
| Asset estate | silver `cloud_asset` / `device` · `okf:cloud_asset` `okf:device` | this client's CIs | EOL dates, ages, OS versions, warranty — the lifecycle evidence (#1689) |
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the client record | who the relationship is with |
| Transaction | silver `opportunity` · `okf:opportunity` | open/recent for this account | renewal + expansion context |
| Engagement + service | silver `interaction` / `ticket` · `okf:interaction` `okf:ticket` | recent history for this account | service-friction signals on the estate |
| Strategic record | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | the client's own roadmap / standards |

> **Asset/CMDB facts are a direct read (#1689).** `cloud_asset`/`device` are read-only in
> client-success's scope; Felix/Service owns the CMDB as system of record. Read it directly to
> ground the lifecycle assessment — never write or correct a CI, and stay strictly within THIS
> client's CIs (the confidential boundary). A Felix/service handoff may still *supply* an
> estate picture when one is pushed, but the read no longer depends on it.

## Process

1. `[script]` Resolve the client `account`. Read the contacts, open/recent opportunities,
   recent interactions + tickets, and the latest `strategic_business_review`. Stay within
   THIS client (strict confidential boundary — never read across clients).
2. `[script]` Read the client's `cloud_asset`/`device` CIs directly (EOL dates, ages, OS
   versions, warranty, named-asset incident links). If the CMDB carries no CIs for this
   client, record "estate unknown" — do not reconstruct one.
3. `[sonnet]` Assemble the estate-context picture: the relationship + service standing plus
   the read asset evidence, each point citing its source row (CI id / silver row). No new
   outreach.

## Outputs

`estate-context.md` — the resolved client, the relationship + service + strategic standing,
and the asset/CMDB evidence (each item sourced to its CI / silver row).
States "estate unknown" if the CMDB held no CIs for this client.

## Audit

- [ ] Only this client's data was read (no cross-client leakage)
- [ ] Asset facts cite their `cloud_asset`/`device` CI row — read-only, never written or corrected
- [ ] Each point cites a source row (no unsourced assertion)
- [ ] An absent asset picture is recorded as "estate unknown" (not fabricated)
