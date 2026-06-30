# Workflow: recurring-revenue-analytics (finance v1)

**Job:** read the governed recurring-revenue metric contracts (MRR / ARR / NRR) and the
revenue-churn trend, **consuming** the `metric_definition` layer — and produce a
**recurring-revenue analytics read**: the metric levels, the period-over-period trend, and any
material movement **flagged** to the cockpit / Sterling, and **fed to the renewal motion**.
Read-only; Audrey reads the governed metrics and lights up the trend, a human (and Chase) acts.

**Trigger:** a revenue / board-reporting cycle, a period close, or an on-demand "where is MRR /
ARR / NRR trending?" ask. One run per as-of date.

**What this is NOT — consumes, never re-derives.** Audrey **consumes** the governed
`metric_definition` contracts (MRR / ARR / NRR / revenue-churn, #1050); she does **not**
re-derive the metric math (D1 — read the governed contract, never re-derive it). She does
**not** duplicate the churn-scoring model (#1046) and does **not** run Chase's renewal motion —
she **feeds** it: her recurring-revenue read is intel into the renewal decision, advise-only,
the renewal block / approve and send-for-signature stay a human (and Chase) call.

**Output identity:** an internal, reversible `operational`-class flag / read raised to the
cockpit / Sterling (and parked as intel for the renewal motion). **There is no external send
and no money action in this workflow** — QuickBooks Online is the system of record for money
movement (ADR-0123); Audrey never posts, alters an invoice, edits a metric definition, or
pushes to QBO.

## The forecast doctrine (D3 — for any forward-looking element)

Where this read carries a forward-looking element (e.g. an ARR run-rate projection), it follows
the **transparent-projection rule (D3)**: the projection shows its **method + assumptions +
as-of date**, is labeled **inference / scenario**, is a **reversible signal**, and is **never a
gap-fill** — if a projection input is missing, Audrey escalates THAT gap, never guesses it.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | read-metrics | Read the governed MRR / ARR / NRR + revenue-churn metric contracts (consumed, not re-derived), as-of dated | — |
| 02 | trend-and-flag | Compute the period-over-period trend; flag material movement; raise to cockpit / Sterling + feed the renewal motion | **cockpit / Sterling loop** |

## Autonomy

Read-only, **tops out at L2 by structure** (audrey.md — no external-send rung, no money rung
to occupy). Starts `draft` (ADR-0061); when flipped to `auto`, stage 02 may auto-raise the
**internal** recurring-revenue read + trend flags to the cockpit / Sterling without being asked
— internal and reversible (a flag can be dismissed). It may **never** post, alter an invoice,
edit a metric definition, or push to QBO; there is no such action to self-approve. **Advise-only
to the renewal motion** — the renewal block / approve is a human (and Chase) call. A data gap is
escalated as a gap, never estimated into. Figures carry their source and **as-of date**,
measured vs derived labeled (audrey.md).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `rr-analytics-rubric.md` — which governed
`metric_definition` contracts to consume (MRR / ARR / NRR / revenue-churn), how to read the
trend, the material-movement threshold, the consumes-never-re-derives rule (D1), the
advise-only-to-renewal boundary, and the D3 rule for any forward-looking element. Mark-editable;
stages cite it, nothing restates it. Rules of the format: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed prose is `prose.md`.
