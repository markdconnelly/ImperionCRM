# Workflow: problem-investigation (problem-mgmt v1)

**Job:** every recurring-incident cluster (or Felix escalation) gets a grounded
root-cause investigation, a proposed permanent fix, and a problem record — with
the documentation handed to Lexicon.

**Trigger:** a recurring-incident cluster is detected (repeated tickets on the
same CI/account) or Felix escalates an incident as a candidate problem. One run
per problem.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | cluster-review | Confirm the cluster + assemble the incident/CI evidence | — |
| 02 | root-cause | Trace the diagnostic chain to a grounded cause | — |
| 03 | propose-fix | Propose the permanent fix + open problem record; doc handoff | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 tracer runs at **L1**; Sage's ceiling is L3. When
flipped to `auto` it may self-approve ONLY writing the internal problem-record
finding when the cause is grounded and the proposed fix has no production or
irreversible blast radius. Every production change and every irreversible fix parks
for a human and routes to Marshall (Change & Release), in every mode — dial-proof
(CONSTITUTION §5.4).

## Runtime skills

None at v1 (`skills: []`). Diagnostic rubrics and the problem-record template
arrive as workflow-local Tier-3 skills when the L3 fix rung is dialled on. Rules of
the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed workflow prose is `prose.md`.
