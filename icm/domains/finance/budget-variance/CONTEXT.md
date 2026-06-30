# Workflow: budget-variance (finance v1)

**Job:** read the human-authored operating **plan** (silver `budget`) against the
**actuals** (attested time, approved expense, the invoice mirror) and produce a
**plan-vs-actual variance read** — the delta per account / period, as-of dated, with
**material variances flagged** and raised to the cockpit / Sterling. Read-only; Audrey
computes and flags the variance, a human reads and acts.

This is the headline forward-looking FP&A capability of epic #1394 — it brings Audrey from
record/report/recon-only to a plan-vs-actual variance read.

**Trigger:** a budgeting / board-reporting cycle, a period close, or an on-demand "how are
we tracking to plan?" ask. One run per period + as-of date.

**Output identity:** an internal, reversible `operational`-class flag / escalation raised to
the cockpit / Sterling. **There is no external send and no money action in this workflow** —
Audrey reads the plan + actuals, computes the variance, and flags the material ones; a human
acts. QuickBooks Online is the system of record for money movement (ADR-0123); Audrey never
posts an entry, alters an invoice, edits the budget, or pushes to QBO. The `budget` plan is
**agent READ-ONLY** — there is no agent write path to it, ever (#1718, epic #1394).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Read the `budget` plan + the actuals (time_record / expense_item / invoice) for the period, as-of dated | — |
| 02 | compute-variance-and-flag | Compute the plan-vs-actual delta per account / period; flag material variance; raise to cockpit / Sterling | **cockpit / Sterling loop** |

## Autonomy

Read-only, **tops out at L2 by structure** (audrey.md — no external-send rung, no money rung
to occupy). Starts `draft` (ADR-0061); when flipped to `auto`, stage 02 may auto-raise the
**internal** plan-vs-actual variance read + material-variance flags to the cockpit /
Sterling without being asked — internal and reversible (a flag can be dismissed). It may
**never** edit the budget, post, alter an invoice, or push to QBO; there is no such action to
self-approve. A data gap is escalated as a gap, never estimated into. Figures carry their
source and **as-of date**, measured vs derived labeled (audrey.md).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `variance-rubric.md` — how to align the `budget` plan
to actuals per account / period, the material-variance threshold + signal source, the
tie-out discipline (plan, actual, delta, as-of date), and the signal-vs-inference rule.
Mark-editable; stages cite it, nothing restates it. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
