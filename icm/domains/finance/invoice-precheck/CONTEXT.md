# Workflow: invoice-precheck (finance v1)

**Job:** review each `generated_invoice` draft for anomalies — missing lines,
rate-vs-contract mismatch, hours that do not equal attested time, math errors —
and flag them **before** the Mark-gated QBO push, purely by reading. Highest-
leverage prevention: it catches a money error before it reaches a client.

**Trigger:** a `generated_invoice` draft is assembled and is sitting in the
pre-QBO-push state (ADR-0085, #1095) — the app-native invoice draft *before* the
Mark-gated push to QuickBooks Online. One run per draft.

**Read-only, advisory.** Audrey never pushes to QBO and never edits the invoice
(ADR-0123 / ADR-0085) — the QBO push and any correction are a human call. This
workflow only reads the draft and its source signals and raises an internal flag.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | read-draft | Read the draft + its attested-time and contract-rate signals | — |
| 02 | flag-anomalies | Cross-check the draft vs its signals; raise the pre-push flag | — |

## Autonomy

Tops out at **L2 by structure** (audrey.md): Audrey has no external-send and no
money action, so there is no higher rung. Starts `draft` (ADR-0061). When flipped
to `auto`, stage 02 may self-approve ONLY the **internal** anomaly flag /
escalation — reversible, never client-facing, never a write. A draft whose tie-out
is not fully measured (missing attested time or contract rate) parks for a human;
Audrey escalates the data gap, she does not estimate into it. The QBO push itself
is external and **Mark-gated in every mode** — it is never in this workflow's reach.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `precheck-rubric.md` — the anomaly checklist
and tie-out discipline. Mark-editable business content; stages cite, never restate.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed workflow prose is `prose.md`.
