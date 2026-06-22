# Stage 02 — asset-status

**Job:** snapshot the current status of the asset(s) named in the dossier.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Dossier | stage 01 `dossier.md` | affected asset reference(s) | what to look up |
| Device status | silver `device` · `okf:device` | the affected endpoint / network device | online state, last-seen, patch + backup posture |
| Cloud asset status | silver `cloud_asset` · `okf:cloud_asset` | the affected cloud resource | state, region, provider |

## Process

1. `[script]` From the dossier's asset reference, look up the matching `device`
   (by name / mac / serial) and/or `cloud_asset` (by resource id). No match →
   record `asset not in CMDB`.
2. `[haiku]` Summarize each resolved asset's current status: online/offline (or
   running/stopped), last-seen, patch level and backup posture (device), or
   provider/region/state (cloud_asset).
3. `[script]` Flag status anomalies that bear on the symptom — offline, stale
   patch, failed/old backup, stopped resource.

## Outputs

`asset-status.md` — resolved asset(s) · current status snapshot per asset · flagged
anomalies · or `no asset identified` / `not in CMDB`.

## Audit

- [ ] Each asset reference from the dossier resolved, or marked `not in CMDB`
- [ ] A status snapshot is present for every resolved asset
- [ ] Anomalies listed (an empty list is valid; blank is not)
