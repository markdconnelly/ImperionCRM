# Workflow: run-pir (problem-mgmt v1)

**Job:** every RESOLVED problem gets a structured post-incident review — timeline,
confirmed root cause, contributing factors, and corrective/preventive actions — with
the known_error refinement and any follow-up tickets PROPOSED, never actuated.

**Trigger:** a `problem` reaches `resolved` (status `resolved`, ADR-0079 / mig 0223,
Stream 05). One run per resolved problem.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | assemble-record | Assemble the resolved problem + its incident ticket + its known_error | — |
| 02 | root-cause-review | Reconstruct the timeline; confirm (or challenge) the recorded root cause | — |
| 03 | corrective-actions | Derive contributing factors + corrective/preventive actions | — |
| 04 | propose | Write the internal PIR record; PROPOSE the permanent_fix + follow-ups | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 workflow runs at **L1**; Sage's ceiling is L3. When
flipped to `auto` it may self-approve ONLY writing the internal PIR record and its
work-note when the root cause is confirmed by the evidence. There is **no
`problem:write` on the autonomous path** — every `known_error` refinement
(`permanent_fix`) and every follow-up ticket is a proposal that parks for a human and
routes to Marshall (Change & Release), in every mode — dial-proof (CONSTITUTION §5.4).

## Runtime skills

None at v1 (`skills: []`). The PIR rubric and the corrective/preventive-action
template arrive as workflow-local Tier-3 skills if the format hardens. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed workflow prose is `prose.md`.
