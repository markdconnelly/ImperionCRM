# Workflow: win-loss-analysis (sales v1)

**Job:** turn a closed cohort of `won`/`lost` opportunities into a win-loss brief — gather
the outcomes + reasons + competitor/source attribution, synthesize why deals close or slip
(by segment/competitor/source), and narrate a launchpad that feeds pricing (02-C1), forecast
(02-C4), and demand (Stream 01/Belle). This is Chase's learning back-channel: a B3
synthesis-brief that **reads and flags, never actuates** (02-C7).

**Trigger:** schedule (post-period) or a closed cohort of `won`/`lost` opportunities reaching
a sample. One run per cohort.

**No send identity / reads-and-flags:** nothing in this workflow exits to an external party and
nothing writes silver. It reads the outcome read-model, synthesizes patterns, and narrates a
brief whose findings are advisory. Every surfaced finding pre-stages an owning worker procedure
**parked** for one-click launch — a human acts on it through that procedure (02-C1 rate-card
review / a Belle Stream-01 procedure), never here. Belle feeds the demand lens as a seam INPUT;
Chase is the single owner.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Gather closed-won/lost outcomes + reasons + competitor/source attribution; cite each `opportunity` + as-of; dormant source → flag stale, never present as live | — |
| 02 | synthesize | Synthesize win/loss patterns by segment/competitor/source; pool-correlate across the deal base internally only (anonymized/aggregated) | — |
| 03 | narrate-deliver | Narrate the brief (P2); apply the B3 launchpad rule (pre-stage owning procedures parked); deliver → Sterling + Belle + 09-17 roll-up; log | — |

## Autonomy

**L0/L1 — read + flag, no actuation.** This workflow only reads, synthesizes, and narrates;
it never sends, never writes silver, never actuates a fix. There is no checkpoint because there
is nothing to approve — every surfaced finding is advisory and a human acts on it through the
owning procedure (02-C1 rate-card review / a Belle Stream-01 procedure), never here. The L3
ceiling of the domain (room.md) does not apply: this procedure tops out at read+flag (02-C7,
B3 delegate-only). Cross-deal benchmarks are anonymized/aggregated only — **pool, never bleed**
(A7).

## Runtime skills

None. This workflow grounds entirely on the outcome read-model + its OKF rooms; it composes no
domain- or workflow-tier runtime skill. Rules of the format: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
