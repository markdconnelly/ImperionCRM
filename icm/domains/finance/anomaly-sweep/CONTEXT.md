# Workflow: anomaly-sweep (finance v1)

**Job:** proactively scan the finance silver for **financial anomalies + controls drift** —
margin compression, cost spikes, duplicate / aberrant entries, reconciliation drift — and
produce a **flagged-anomaly set with tie-outs**, each escalated to the cockpit / Sterling.
Read-only; Audrey scans, ties out, and flags; a human reads and acts. This is Audrey's
dedicated anomaly room — the auditor's watchdog.

**Trigger:** a scheduled sweep cadence (the controls watchdog), a period close, or an
on-demand "scan finance for anything off" ask. One run per as-of date.

**Output identity:** an internal, reversible `operational`-class flag / escalation raised to
the cockpit / Sterling. **There is no external send and no money action in this workflow** —
Audrey reads finance silver, ties out the anomaly, and flags it; a human acts. QuickBooks
Online is the system of record for money movement (ADR-0123); Audrey never posts, alters an
invoice, deletes an entry, or pushes to QBO — a flagged duplicate or aberrant entry is raised
for a human (and QBO) to resolve, never corrected by Audrey.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | scan | Scan the finance silver (time / timesheet / expense / invoice / generated_invoice) for candidate anomalies, as-of dated | — |
| 02 | flag-with-tie-out | Tie out each candidate, flag the confirmed anomalies, and escalate to the cockpit / Sterling | **cockpit / Sterling loop** |

## Autonomy

Read-only, **tops out at L2 by structure** (audrey.md — no external-send rung, no money rung
to occupy). Starts `draft` (ADR-0061); when flipped to `auto`, stage 02 may auto-raise the
**internal** flagged-anomaly set to the cockpit / Sterling without being asked — internal and
reversible (a flag can be dismissed). It may **never** post, alter or delete an entry, fix a
duplicate, or push to QBO; there is no such action to self-approve. A data gap is escalated as
a gap, never estimated into. Figures carry their source and **as-of date**, measured vs
derived labeled (audrey.md).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `anomaly-rubric.md` — the anomaly classes (margin
compression, cost spike, duplicate / aberrant entry, reconciliation drift), each class's
detection signal + tie-out, the materiality / confidence threshold, and the
signal-vs-inference rule. Mark-editable; stages cite it, nothing restates it. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose
is `prose.md`.
