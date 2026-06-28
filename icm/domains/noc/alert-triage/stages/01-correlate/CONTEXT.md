# Stage 01 — correlate

**Job:** turn a raw monitoring alert into one correlated context record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Alert event | the triggering row (Datto RMM device alert / cloud health event / alert ticket) | full payload | the subject |
| Affected device | silver `device` · `okf:device` | the device(s) named/implicated by the alert | CI status + recent signal |
| Affected cloud asset | silver `cloud_asset` · `okf:cloud_asset` | the cloud resource(s) implicated | CMDB CI status |
| Open tickets | silver `ticket` · `okf:ticket` | open/recent tickets for the same CI or account | correlate to existing work |
| Owning account | silver `account` · `okf:account` | the account the CI resolves to | client context |

## Process

1. `[script]` Extract alert identity (source, CI key/`mac`, severity, metric,
   timestamp, message) from the payload's known keys. Missing CI key → audit fail.
2. `[script]` Resolve the affected CI: match the alert to silver `device` /
   `cloud_asset` by CI key, and to the owning `account`. Never write here.
3. `[script]` Pull open/recent tickets for the same CI or account — the existing
   work this alert may belong to.
4. `[sonnet]` State the correlation: what other recent alerts/signals on this CI or
   account share a pattern, and one sentence naming the common thread (or "isolated").

## Outputs

`context.md` — alert identity, resolved CI + account, open-ticket links,
correlation summary (pattern or isolated). No classification yet.

## Audit

- [ ] CI key resolved to a device or cloud_asset id (or stated unresolved)
- [ ] Owning account stated (or `unknown`)
- [ ] Correlation summary present (`isolated` is valid; blank is not)
