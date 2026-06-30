# Workflow: marketing-metrics (marketing v1)

**Job:** surface marketing analytics + multi-touch attribution as a read-model —
gather and normalize Social Metrics + `campaign_metric`, union organic ∪ paid, compute
touch → opportunity → won attribution, and flag anomalies/stale sources for a human.
This is Belle's reporting back-channel: a B3 synthesis-brief that **reads and flags, never
actuates** (Stream 01-M; under-performers are surfaced, the owning worker is a human's call).

**Trigger:** a metrics-refresh / reporting tick — a scheduled reporting cadence, a campaign
close, or an operator opening the analytics / BI hub marketing section. One run per refresh.

**No send identity:** nothing in this workflow exits to an external party and nothing writes
silver. It reads the metric substrate, normalizes it, and emits flags. Every surfaced finding
is advisory — a human acts on it through the owning procedure (re-budget 01-C / re-plan 01-L).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Ingest + normalize Social Metrics + `campaign_metric`, cite source + as-of; dormant collector → flag stale, never present as live | — |
| 02 | synthesize | Union organic ∪ paid; compute multi-touch attribution (touch → opportunity → won); benchmark anonymized/aggregated only | — |
| 03 | flag | Surface anomalies + stale sources for a human; read-and-flag only, no actuation | — |

## Autonomy

**L0/L1 — read + flag, no actuation.** This workflow only reads, normalizes, and flags;
it never sends, never writes silver, never actuates a fix. There is no checkpoint because
there is nothing to approve — every surfaced finding is advisory and a human acts on it
through the owning procedure (01-C re-budget / 01-L re-plan), never here. The L3 ceiling of
the domain (room.md) does not apply: this procedure tops out at read+flag (Stream 01-M).
Cross-client benchmarks are anonymized/aggregated only — **pool, never bleed** (A7).

## Runtime skills

None. This workflow grounds entirely on the metric read-model + its OKF rooms; it composes no
domain- or workflow-tier runtime skill. Rules of the format: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.

## SOP (the dual-audience document)

The full human+machine SOP for this procedure — frontmatter procedure-object + the end-to-end
runnable B3 steps (gather → synthesize → deliver), the launchpad-not-readout seam to 01-C/01-L,
the learning on-ramp, and the dormancy posture — is the canonical SOP → [`sop.md`](sop.md)
(ADR-0136 A8; following the template-defining exemplar, social-inbox #1759). This `CONTEXT.md`
stays the thin routing surface; `sop.md` is the canonical prose. The control layer (§A
invariants, the B3 archetype rule) is cited there from ADR-0136, never redefined.
