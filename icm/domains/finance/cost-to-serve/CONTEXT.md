# Workflow: cost-to-serve (finance v1)

**Job:** a generalized **client / service-line profitability read-model** — read the governed
`cost_to_serve` / `margin_to_serve` metric contracts (**consumed**, not re-derived) and produce
a **profitability read**: cost-to-serve and margin per client / service line, with thin-margin
or margin-compression **flagged** to the cockpit / Sterling and supplied as note-only context to
the line agents. Read-only; Audrey reads the governed metrics and lights up the margin, a human
acts.

This **generalizes** what `renewal-margin` does narrowly (one renewal subject) into a
department-wide profitability read across clients / service lines.

**Trigger:** a profitability / board-reporting cycle, a period close, or an on-demand "where is
margin thin?" ask. One run per as-of date.

**What this is NOT — consumes, never re-derives; does not duplicate profitability #1044.**
Audrey **consumes** the governed `cost_to_serve` / `margin_to_serve` contracts in
`metric_definition` (D1). The cost / revenue allocation views (migs 0197/0198/0200) are
**upstream** — their composed result is exposed through those governed metrics, which IS the
consumption surface; Audrey does **not** read the allocation views directly and does **not**
re-derive the allocation math. She does **not** duplicate the profitability epic (#1044) — she
reads its governed output. Profitability context goes **note-only** to Pierce / Celeste / Vance
(advise-never-block — she informs their decision; the block / approve is theirs and a human's).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | read-cost-and-margin | Read the governed `cost_to_serve` / `margin_to_serve` contracts per client / service line (consumed, not re-derived), as-of dated | — |
| 02 | profitability-read-and-flag | Compute the per-client / per-service-line margin picture; flag thin / compressing margin; raise to cockpit / Sterling + note-only to the line agents | **cockpit / Sterling loop** |

## Autonomy

Read-only, **tops out at L2 by structure** (audrey.md — no external-send rung, no money rung
to occupy). Starts `draft` (ADR-0061); when flipped to `auto`, stage 02 may auto-raise the
**internal** profitability read + margin flags to the cockpit / Sterling without being asked —
internal and reversible (a flag can be dismissed). It may **never** post, alter an invoice, edit
a metric definition, or push to QBO; there is no such action to self-approve. **Advise-never-block
to the line agents** — the block / approve is their and a human's call. A data gap is escalated as
a gap, never estimated into. Figures carry their source and **as-of date**, measured vs derived
labeled (audrey.md).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `cost-to-serve-rubric.md` — which governed contracts to
consume (`cost_to_serve` / `margin_to_serve`), the per-client / per-service-line read structure,
the thin-margin / compression threshold, the consumes-never-re-derives rule (D1, allocation views
are upstream), and the advise-never-block boundary to Pierce / Celeste / Vance. Mark-editable;
stages cite it, nothing restates it. Rules of the format: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed prose is `prose.md`.
