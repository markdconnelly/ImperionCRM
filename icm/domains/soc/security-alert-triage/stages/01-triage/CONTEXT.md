# Stage 01 — triage

**Job:** turn a raw security detection into one classified triage record with the
implicated assets and identities resolved.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Alert event | the triggering row (Sentinel incident / Defender alert) | full payload | the subject |
| Implicated assets | silver `device` / `cloud_asset` · `okf:device` `okf:cloud_asset` | CIs matched by host/resource id | resolve what the alert touches |
| Owning account | silver `account` · `okf:account` | the customer the asset belongs to | scope + ownership |

## Process

1. `[script]` Extract the detection fields (rule/signal, severity, host/resource
   ids, principal, timestamp) from the payload's known keys. No host/resource id
   resolvable → audit fail.
2. `[script]` Resolve implicated CIs: match against silver `device`/`cloud_asset`
   by host/resource id; resolve the owning `account`. Reference ids only — never
   copy PII or secret material.
3. `[sonnet]` Classify signal vs noise: `true-positive` | `benign-positive` |
   `false-positive` | `needs-investigation`, one sentence of reasoning citing the
   detection signal and the resolved assets.

## Outputs

`triage.md` — signal/noise class + reasoning, implicated `device`/`cloud_asset`
ids, owning `account` id, severity. `false-positive` and `benign-positive` carry
through to enrichment-lite; `spam`-class noise ends the run with a dismissal note.

## Audit

- [ ] Exactly one signal/noise class with one sentence of reasoning present
- [ ] At least one implicated asset id resolved, or stated `none-resolvable`
- [ ] No client PII or secret material in the record (audit-by-reference)
