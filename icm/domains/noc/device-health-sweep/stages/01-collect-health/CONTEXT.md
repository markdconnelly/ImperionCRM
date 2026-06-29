# Stage 01 — collect-health

**Job:** read the in-scope fleet's health signal into one snapshot record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Device health | silver `device` · `okf:device` | in-scope devices: disk, patch level, last-seen/offline, backup-adjacent health markers | the endpoint/network health to score |
| Cloud asset health | silver `cloud_asset` · `okf:cloud_asset` | in-scope cloud resources: CMDB CI status + health markers | the cloud CI health to score |
| Open tickets | silver `ticket` · `okf:ticket` | open/recent tickets on the swept CIs | suppress what is already tracked |
| Owning account | silver `account` · `okf:account` | the account each CI resolves to | client context for prioritisation |

## Process

1. `[script]` Enumerate the in-scope CIs and pull their health fields from silver
   `device` / `cloud_asset` by known key (disk free %, patch age, last-seen,
   backup-adjacent health marker). Never write here.
2. `[script]` Resolve each CI to its owning `account` for client context.
3. `[script]` Pull open/recent tickets for each swept CI — the existing work a risk
   may already belong to.
4. `[haiku]` Normalise the snapshot: one row per CI with its health fields, owning
   account, and whether an open ticket already covers it. Missing health field →
   record as `unknown`, never inferred.

## Outputs

`snapshot.md` — one row per in-scope CI: health fields, owning account, and the
open-ticket coverage flag. No scoring yet.

## Audit

- [ ] Every in-scope CI is present (or explicitly listed as unreadable)
- [ ] Owning account stated per CI (or `unknown`)
- [ ] Open-ticket coverage flag set per CI
- [ ] No write occurred — this stage reads only
