# Stage 02 — synthesize

**Job:** turn the gather record into an SLA-risk-bucketed, breach-ranked roll-up with
the escalation flags isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Bucket the backlog by SLA risk — breached / at-risk (approaching the
   clock) / on-track — per account; age each bucket (fresh / 3d / 7d / 14d+).
2. `[sonnet]` Rank by breach proximity and blast radius (priority, the CIs and users
   behind the ticket), what is about to hurt leading.
3. `[sonnet]` Isolate the flags — stuck escalation-worthy tickets (aged past their
   tier with no progress), repeat offenders (same CI or symptom recurring), and
   concentration risk (one account absorbing a disproportionate share of the
   backlog) — each with the exposure stated.
4. `[sonnet]` Cross-correlate the flags against prior Delivery activity internally
   only — pool, never bleed; nothing here is client-facing.

## Outputs

`synthesis.md` — an SLA-risk-bucketed, breach-ranked roll-up (about-to-breach
leading) and a separate flag list, each item naming the ticket, the account, and the
breach/age exposure, and noting any prior Delivery activity already in motion.

## Audit

- [ ] Backlog is bucketed by SLA risk (breached / at-risk / on-track) and aged per account
- [ ] Roll-up is breach-ranked, about-to-breach leading, with blast radius stated
- [ ] Every flag names a ticket and account and states the breach/age exposure
- [ ] Cross-correlation is internal only — no client-facing content produced
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — no ticket touched, no note written, no client contacted
- [ ] No send/write/actuation occurred — Dexter delegated or parked
