# Stage 02 — detect-imbalance

**Job:** detect load imbalance across technicians and the SLA-at-risk tickets in
the snapshot.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Queue snapshot | stage 01 `queue-snapshot.md` | all | the open queue + per-technician load to analyse |
| Ticket SLA + priority | silver `ticket` · `okf:ticket` | priority, age, and SLA window per queued ticket | which tickets are breaching or aging |
| Device requiring work | silver `device` · `okf:device` | the CI each onsite ticket targets | skill fit for a later rebalance |

## Process

1. `[sonnet]` Over the snapshot, find load imbalance across technicians (some
   overloaded while others are light) and the SLA-at-risk tickets — aging past
   their window, or a high-priority ticket sitting unassigned. State the evidence
   per finding (the age, the priority, the load gap).
2. `[sonnet]` Rank the findings by urgency (SLA breach first, then imbalance).
   An imbalance or risk you cannot ground in the snapshot is not a finding — never
   manufacture one. Never write here.

## Outputs

`imbalance-findings.md` — the ranked list of load-imbalance and SLA-at-risk
findings, each with its grounding evidence, or a `no-imbalance` finding when the
queue is balanced. No assignment is proposed yet.

## Audit

- [ ] Each finding grounded in the snapshot evidence (age / priority / load gap)
- [ ] SLA-at-risk tickets ranked ahead of pure imbalance, OR a `no-imbalance`
      finding raised
- [ ] No assignment, note, or send occurred
