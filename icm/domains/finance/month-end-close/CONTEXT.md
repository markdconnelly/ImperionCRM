# Workflow: month-end-close (finance v1)

**Job:** at month-end, read across attested time, approved expense,
reconciliation state, and invoice state and produce a **close-readiness
checklist + blocker flags** — never the close itself.

**Trigger:** the month-end close window opens (the CFO's close cadence, or an
on-demand "are we ready to close?" ask). One run per accounting period.

**Output identity:** an internal, reversible `operational`-class flag /
escalation raised to the cockpit / CFO. **There is no external send and no money
action in this workflow** — Audrey reads, ties out, and flags; a human (and QBO)
acts. QuickBooks Online is the system of record for money movement (ADR-0123);
Audrey never closes the month, posts an entry, alters an invoice, or pushes to
QBO.

This is the agent face of the already-wired close discipline behind ADR-0082
(time, #458) and ADR-0083 (expense, #482): the attestation reconciliation
summaries those flows produce are read here as signal, not recomputed.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather-close-state | Read attested time + approved expense + recon summaries + invoice state, as-of dated | — |
| 02 | checklist-blockers | Build the close-readiness checklist + flag blockers; raise to CFO | **CFO loop** |

## Autonomy

Read-only, **tops out at L2 by structure** (audrey.md — no external-send rung, no
money rung to occupy). Starts `draft` (ADR-0061); when flipped to `auto`, stage
02 may auto-raise the **internal** close-readiness checklist + blocker flags to
the cockpit / CFO without being asked — internal and reversible (a flag can be
dismissed). It may **never** close the month, post, alter an invoice, or push to
QBO; there is no such action to self-approve. A data gap is escalated as a gap,
never estimated into.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `close-checklist-rubric.md` — the
Mark-editable month-end close-readiness checklist (timesheets attested, expenses
approved, recons matched, invoices drafted), each item's blocker condition +
signal source, and the tie-out discipline. Stages cite it; nothing restates it.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed workflow prose is `prose.md`.
