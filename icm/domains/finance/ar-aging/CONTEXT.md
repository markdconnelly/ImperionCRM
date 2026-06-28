# Workflow: ar-aging (finance v1)

**Job:** produce a read-only **AR aging + cash-position summary** for the CFO / board —
bucket open receivables by age (current / 1–30 / 31–60 / 61–90 / 90+) off the `invoice`
QBO read-only mirror, and surface the resulting cash-position picture. Read-only; Audrey
**summarizes**, a human reads.

**Trigger:** a month-end / board-reporting cycle, or an on-demand "where does AR stand?"
request. One run per as-of date.

**What this is NOT — EXPLICITLY NOT DUNNING.** Audrey **only summarizes** AR for the
CFO / board. She **never sends a payment reminder** or any external message: sending
reminders is external work that belongs to the **future collections agent**
([#667](https://github.com/markdconnelly/ImperionCRM/issues/667), ADR-0058), not to
Audrey. No send, no posting, no money move, no QBO push — QBO is the system of record for
every invoice and any money movement (ADR-0123). She reads the mirror and reports the
picture; a human (and QBO) acts.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | read-ar | Read the `invoice` QBO mirror; bucket the open AR by age | — |
| 02 | summarize | Produce the AR aging + cash-position summary for the CFO / board | **CFO/board summary loop** |

## Autonomy

Read-only; **tops out at L2** (Audrey has no higher rungs — no send, no money action).
Default rung **L1** (draft the AR aging + cash summary → park for the CFO). At **L2**, the
internal **AR aging + cash-position summary auto-raises** to the cockpit / CFO / board
(reversible — a summary can be dismissed). No send, no posting, no money move, no payment
reminder at any rung — that is the future collections agent (#667). Figures carry their
source and **as-of date**, measured vs derived labeled (audrey.md).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `aging-rubric.md` (the AR aging buckets, the
cash-position summary structure, the NOT-dunning boundary, signal-vs-inference, and the
as-of discipline). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
