# Stage 01 — monitor-health

**Job:** read + compute account health / churn-risk from measured signals and flag the
at-risk accounts. (💤 dormant until the substrate hydrates — #1046 + #1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the client record | who the relationship is with |
| Engagement + service | silver `interaction` / `ticket` · `okf:interaction` `okf:ticket` | recent history for this account | usage / sentiment + service-pattern signals |
| Renewal context | silver `opportunity` · `okf:opportunity` | open renewals for this account | renewal-at-risk weighting |
| Churn rubric | `./skills/intervention-rubric.md` (cites `../../client-360/skills/health-signals.md`) | all | signal-vs-inference + churn indicators |

## Process

1. `[script]` Pull the account + contacts, recent interactions + tickets, and any open
   renewal `opportunity` for the client. Stay within THIS client (strict confidential
   boundary — never read across clients).
2. `[sonnet]` Compute account health + churn-risk per the rubric (which reads the churn
   indicators from `health-signals.md`). For every verdict, **label measured signal vs your
   inference** — a churn flag carries the signals that produced it (celeste.md guardrail 3).
   Never invent health or sentiment.
3. `[script]` Set the disposition seed: at-risk flag (with its signals) or healthy. A healthy
   account ends the run here — nothing to intervene on.

## Outputs

`health.md` — the health / churn-risk verdict (measured signal vs inference labeled), the
at-risk flag with its evidencing signals, and the renewal context. Healthy → run ends.

## Audit

- [ ] Only this client's data was read (no cross-client leakage)
- [ ] Every health / churn verdict labels measured signal vs inference
- [ ] At-risk flag (if set) carries the signals that produced it (no unsourced flag)
- [ ] No outreach drafted or sent here (read + compute only)
