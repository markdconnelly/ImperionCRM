# Workflow: employee-offboarding (people / Internal Ops · G&A v1)

**Job:** every departing employee becomes a structured, tracked offboarding checklist
— access/asset return, knowledge handoff, payroll/benefits closeout, exit steps —
drafted by the agent and gated for a human on anything that deprovisions, sends, or
touches employment, comp, or PII. The actual identity offboarding is Osiris's gated
call; this workflow proposes, it never deprovisions.

**Trigger:** a departure is confirmed (a lifecycle event handed down by Rachel, Chief
of Staff). One run per departing employee.

**Note:** this is an **internal/HR-facing** workflow — it grounds on **no OKF entity**
(the people domain has none yet), it **does not send or actuate** (v1 reads +
orchestrates only — no deprovisioning, no sends), and it **never reads employee PII
into an artifact** (ADR-0060).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather-context | Confirm the departure + assemble role/access/asset context | — |
| 02 | build-checklist | Build the ordered offboarding checklist (access/asset/handoff/closeout/exit) | — |
| 03 | propose-handoff | Track item status; park deprovisioning/comp/PII; propose to a human | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). When flipped to `auto`, this workflow may self-approve
ONLY: drafting and sequencing the internal offboarding checklist and its coordination
tasks for a standard departure (the checklist + the handoff/closeout/exit task list —
internal, reversible, propose-only). Every deprovisioning/provisioning change, every
send, any employment/compensation/PII action, and any audit failure always park for a
human, in every mode. Salary is **never disclosed**.

## Runtime skills

None in v1 (`skills: []`). Mark-editable business content is added as workflow-local
skills (Tier 3, `./skills/`) when the offboarding playbook is templatized. Rules of
the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed workflow prose is `prose.md`.
