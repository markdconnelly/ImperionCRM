# Stage 01 — read-posture

**Job:** read the client's current security posture surface into one posture-read
record with the implicated assets and owning account resolved.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Review subject | the triggering row (scheduled posture sweep for a client) | the client + cadence | the subject |
| Asset health | silver `device` / `cloud_asset` · `okf:device` `okf:cloud_asset` | the client's CIs + their health facts | what carries posture |
| Posture record | silver `posture_snapshot` · `okf:posture_snapshot` | the client's current posture | the read surface |
| Owning account | silver `account` · `okf:account` | the customer the posture belongs to | scope + ownership |

## Process

1. `[script]` Resolve the review subject: the owning `account` for the scheduled
   client. No `account` resolvable → audit fail.
2. `[script]` Read the current `posture_snapshot` for the account; extract the posture
   facts (controls, exposure surfaces, snapshot timestamp) by known key. Reference ids
   and facts only — never copy PII or secret material.
3. `[script]` Read the client's `device`/`cloud_asset` CIs and their health facts
   (compliance state, last-seen, configuration flags) by known key.
4. `[haiku]` Summarise the posture surface in scope: which CIs and which posture facts
   are read this cycle, and the snapshot timestamp — one short paragraph, references only.

## Outputs

`posture-read.md` — the current posture facts, the `device`/`cloud_asset` ids + health
facts, the owning `account` id, and the snapshot timestamp. Drives stage-02 drift
detection.

## Audit

- [ ] An owning `account` id resolved, or stated `none-resolvable`
- [ ] The `posture_snapshot` snapshot timestamp is present
- [ ] No client PII or secret material in the record (audit-by-reference)
