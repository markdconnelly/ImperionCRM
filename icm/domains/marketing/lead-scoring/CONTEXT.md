# Workflow: lead-scoring (marketing v1)

**Job:** recompute one lead's `lead_score` from fit + engagement, persist it (an
internal, reversible write), and evaluate it against the marketing-qualified (MQL)
threshold — when the score crosses, route the lead to Chase / Stream 02
(lead-response) as the **canonical Belle→Chase seam**. This is the seam emitter:
Belle owns the marketing-qualification clock, Chase owns qualify/close; they meet at
the threshold-crossing step and never co-own. (Stream 01-G; the A11 seam.)

**Trigger:** a lead's signals change — a lead is captured (01-F enqueues scoring), a
behavioral/engagement signal accrues, or a scheduled re-score fires. One run per lead.

**Seam, not a send:** the threshold crossing is a **deterministic governed route**
into Stream 02, not an outbound actuation and not a self-approval. There is no
separate hand-off action — the score crossing IS the hand-off.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground-signals | Ground the fit + engagement signals for the lead, each cited + as-of | — |
| 02 | score | Recompute + persist `lead_score` (internal, reversible — L2) | — |
| 03 | evaluate-route | Evaluate vs the MQL threshold; crossed → route to Chase (the A11 seam); below → nurture | — |

## Autonomy

Starts `draft` (ADR-0061). The internal **score recompute + persist** (stage 02) is a
reversible internal write (**L2**) and may self-approve when an admin flips the
workflow to `auto`. The **MQL-threshold routing to Chase** (stage 03) is a
**deterministic governed event**, not an actuation and not a self-approval — the
threshold + routing rule is governed config, executed mechanically. **Changing the
scoring model or the threshold is a human / governed-config act**, never the agent's.
No send leaves this workflow; there is no checkpoint (the routing is deterministic,
not a gate). #389-predictive features are dormant in v1 — score on rules only and say
so (A5c).

## Runtime skills

None workflow-local. Grounding is OKF + signal reads; the scoring rules and the MQL
threshold are governed config, not skill prose. Mark-editable business content lives
in that config, not here; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.

## SOP (the dual-audience document)

The full human+machine SOP for this procedure — frontmatter procedure-object + the
end-to-end runnable steps, the Belle→Chase seam (the MQL crossing IS the hand-off),
the analytics emit (→ 01-M), the learning on-ramp, and the dormancy posture — is
[`sop.md`](sop.md) (ADR-0136 A8; follows the template-defining exemplar, #1759). This
`CONTEXT.md` stays the thin routing surface; `sop.md` is the canonical prose. The
control layer (§A invariants, the B1 archetype rule) is cited there from ADR-0136,
never redefined.
