# Stage 03 — flag-recommend

**Job:** roll scores up, separate systemic misses from one-offs, and write a
recommendation routed to Dexter / Jessica. **This stage parks.**

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Scores | stage 02 `scores.md` | all scored tickets | the evidence to roll up |
| Account roll-up | silver `account` · `okf:account` | the accounts the scored tickets belong to | group the pattern by client |

## Process

1. `[script]` Group the scored tickets by account and by miss-type (low quality,
   high CSAT-risk, SLA breach). Count occurrences per group.
2. `[sonnet]` Separate **one-offs** (a single low score) from **systemic** misses
   (a recurring pattern across tickets/accounts). State the threshold you applied.
3. `[sonnet]` For each systemic miss, write a recommendation: what the pattern is
   (by reference), who owns the fix — **Dexter** (delivery practice) for a recurring
   process miss, **Jessica** (assurance) for the assurance picture — and the
   suggested fix. Tess recommends; she does not actuate.
4. `[script]` Mark the run **parked**: the recommendation awaits a human. No ticket
   is touched, no client is notified.

## Outputs

`recommendation.md` — the roll-up (counts by account/miss-type), the
one-off-vs-systemic split with its threshold, and one routed recommendation per
systemic miss (owner = Dexter / Jessica, suggested fix). All findings **by
reference**. The run ends parked — this is Tess's last act.

## Audit

- [ ] Every systemic flag cites the underlying tickets (by id) that establish the pattern
- [ ] Each recommendation names an owner (Dexter or Jessica) and a suggested fix
- [ ] No verbatim PII / client identifier (audit-by-reference)
- [ ] Run is marked parked — no ticket touched, no client notified, no send

## Checkpoint

A human (Dexter / Jessica) reviews the recommendation. `auto` may **never**
self-approve this stage — every recommendation parks in every mode (Tess is a
watcher with no actuation, ADR-0128 hard ceiling). There is no send path; the fix is
the owner's act, not Tess's.
