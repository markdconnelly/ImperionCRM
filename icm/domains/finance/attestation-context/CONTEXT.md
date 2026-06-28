# Workflow: attestation-context (finance v1)

**Job:** be the agent face of the already-wired time/expense **attestation deviations**
(ADR-0082 / ADR-0083) — surface the reconciliation summary as a memory-jogger for the
approver, and **flag hard deviations** (hours that don't tie out, expenses outside policy,
an attestation gap). Read-only; Audrey flags, a human approves.

**Trigger:** an attestation/approval cycle (a timesheet or expense report awaiting
approval), or an on-demand request. One run per attestation subject.

**What this is NOT:** no approval, no posting, no money move, no QBO push. Audrey reads the
attested facts and flags what doesn't tie out; the approve/reject and any money movement
are a human + QBO (ADR-0123). She never discloses an individual's Pay Rate (salary
non-disclosure, audrey.md).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | read-attested | Read the attested time/expense facts + the reconciliation summary | — |
| 02 | flag-deviations | Tie out the figures; flag hard deviations (signal vs inference) | **CFO/approver loop** |

## Autonomy

Read-only; **tops out at L2** (Audrey has no higher rungs — no send, no money action).
Default rung **L1** (draft the deviation flag → park for the approver). At **L2**, the
internal **deviation flag auto-raises** to the cockpit / approver (reversible — a flag can
be dismissed). No approval, no posting, no money move at any rung. Salary/Pay Rate is used
in the math but **never disclosed** (refusal-class, audrey.md).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `deviation-rubric.md` (what counts as a hard
deviation vs noise + the tie-out discipline + the signal-vs-inference rule). Mark-editable;
stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`. The structured
manifest is `agent.yaml`; the composed prose is `prose.md`.
