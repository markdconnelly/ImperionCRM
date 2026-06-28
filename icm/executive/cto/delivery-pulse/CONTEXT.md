# Workflow: delivery-pulse (CTO / Service Delivery, executive tracer)

**Job:** on a schedule, roll up backlog, SLA, incidents, problems, the change
calendar, and capacity into a delivery pulse for Derek, with the risks surfaced —
drafted here, never actuated.

**Trigger:** scheduled (start of the working day / shift). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull delivery telemetry + the CIs/accounts in scope | — |
| 02 | synthesize | Roll up, rank by risk, isolate the dangerous items | — |
| 03 | pulse | Produce the delivery pulse + the risk list; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Dexter holds no
actuation tool. This tracer runs narrower still — **L1 propose**: it reads,
synthesizes, and parks the pulse for Derek. It never delegates, sends, or writes;
every remediation/change/dispatch remains a sub-agent's under its own gauntlet and
dial. The pulse is a checkpoint, not an action.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + park; voice and guardrails
come from the composed Dexter persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
tracer prose is `prose.md`.
