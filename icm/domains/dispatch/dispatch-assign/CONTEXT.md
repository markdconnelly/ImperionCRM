# Workflow: dispatch-assign (dispatch v1)

**Job:** every ticket flagged for onsite work gets matched to the right technician
(skill, location, availability) and a proposed schedule — with the customer-facing
confirmation gated. Thin: leans on Autotask native dispatch as the system of record.

**Trigger:** a service ticket is flagged for onsite work (by Felix or Ozzie). One
run per onsite ticket.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | match | Match a technician by skill / location / availability | — |
| 02 | propose-schedule | Draft the schedule; customer confirmation gated | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 tracer runs at **L1**; Scout's ceiling is L3. When
flipped to `auto` it may self-approve ONLY writing the internal proposed-assignment
work-note for a grounded match. The **customer-facing schedule confirmation always
parks** for a human, in every mode — dial-proof (CONSTITUTION §5.4).

## Runtime skills

None at v1 (`skills: []`). The technician skills matrix and the availability/
calendar lookup arrive as workflow-local Tier-3 skills (or via the Autotask
dispatch integration) when the L3 internal-schedule rung is dialled on. Rules of
the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed workflow prose is `prose.md`.
