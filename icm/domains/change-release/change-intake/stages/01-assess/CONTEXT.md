# Stage 01 — assess

**Job:** turn a proposed change into one grounded risk score.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Change proposal | the triggering row (Sage fix / operational change / scheduled release) | full payload | the subject |
| Change request + incidents | silver `ticket` · `okf:ticket` | the change request and any linked incidents | scope + justification |
| CIs in scope | silver `device` · `okf:device` | the device(s) the change touches | blast radius |
| Cloud CIs in scope | silver `cloud_asset` · `okf:cloud_asset` | the cloud resource(s) the change touches | blast radius |
| Affected account | silver `account` · `okf:account` | the account(s) impacted | client-impact context |

## Process

1. `[script]` Extract the change scope (what changes, which CIs, why) and resolve
   the in-scope `device`/`cloud_asset` and affected `account`. Never write here.
2. `[sonnet]` Assess blast radius: how many CIs/clients, production vs non-prod,
   reversible vs not, and any linked-incident urgency.
3. `[sonnet]` Risk-score the change (`low` | `medium` | `high`) with one line of
   grounded reasoning. Never under-score for scheduling convenience.

## Outputs

`risk.md` — change scope, resolved CIs + account, blast-radius assessment, risk
score + reasoning, reversibility flag.

## Audit

- [ ] In-scope CIs and affected account resolved (or stated unresolved)
- [ ] Exactly one risk score present, grounded in blast radius
- [ ] Reversibility flag stated
