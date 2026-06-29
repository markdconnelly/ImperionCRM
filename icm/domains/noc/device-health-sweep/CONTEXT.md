# Workflow: device-health-sweep (noc v1)

**Job:** on a schedule, read the device and cloud-asset health substrate, surface
the items degrading or at risk (disk pressure, patch lag, offline, backup-adjacent
health), and PROPOSE a ticket or internal work-note for each at-risk item — never
actuating.

**Trigger:** a scheduled sweep tick (the cadence is operational config, not stated
here). One run per sweep window over the in-scope fleet — the proactive complement
to the reactive `alert-triage` (Ozzie is *summoned by an alert* there; here he reads
the fleet on a timer).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | collect-health | Read device/cloud-asset health + open tickets into one fleet snapshot | — |
| 02 | assess-risk | Score each item healthy / degrading / at-risk against the health rubric | — |
| 03 | propose | Propose a parked ticket per at-risk item OR write the benign internal finding | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). The v1 sweep runs at **L1** even though Ozzie's ceiling
is L4: when flipped to `auto` it may self-approve ONLY writing the internal sweep
finding/work-note for a benign or already-tracked item. Every proposed ticket and
every external-facing effect parks for a human, in every mode. Destructive and
identity-touching actions and security events are dial-proof — they never
auto-execute at any rung (CONSTITUTION §5.4).

## Runtime skills

None at v1 (`skills: []`). The health rubric and the at-risk thresholds are stated
inline in the stage contracts at the tracer rung; they graduate to a
workflow-local Tier-3 skill (`./skills/health-rubric`) the moment the catalogue of
checks grows past what a stage contract should carry. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
