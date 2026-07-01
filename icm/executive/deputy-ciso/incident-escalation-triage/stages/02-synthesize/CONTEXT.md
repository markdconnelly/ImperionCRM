# Stage 02 — synthesize

**Job:** triage the gather record into a severity/blast-radius-ranked list with
the Mark-now escalations isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Group the signals by incident; collapse duplicates across tickets
   and tenants into one incident line each.
2. `[sonnet]` Rank by severity and blast radius: active/spreading first, then
   contained-but-unverified, then closed-this-window. An unverified state stays
   "unconfirmed — Cyrus is verifying," never an assumed all-clear.
3. `[sonnet]` Isolate what must reach Mark NOW (active incident, client-facing
   exposure, containment decision pending) versus what rides the next scheduled
   posture brief — each Mark-now item framed as the one decision he needs, by
   reference, no PII.

## Outputs

`synthesis.md` — a severity/blast-radius-ranked incident list (active leading)
and a separate Mark-now escalation list, each item naming the incident, the
blast radius, and the decision required, by reference.

## Audit

- [ ] Ranked by severity and blast radius, active incidents leading
- [ ] No unverified state asserted as contained or all-clear
- [ ] Every Mark-now escalation names one incident and one decision
- [ ] No client PII, no secret values present (audit by reference)
- [ ] No item restates the gather list verbatim (it must be triaged)
