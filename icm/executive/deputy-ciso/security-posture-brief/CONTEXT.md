# Workflow: security-posture-brief (Deputy CISO / Security & Compliance, executive tracer)

**Job:** on a schedule (and on an incident signal), roll up SOC, GRC, and Identity
posture into one brief for Mark, with the escalations surfaced — drafted here,
never actuated.

**Trigger:** scheduled (start of the working day); also runnable on an incident
signal. One run per cycle or incident.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull SOC/GRC/Identity posture + the assets/accounts in scope | — |
| 02 | synthesize | Roll up, rank by exposure, isolate escalations | — |
| 03 | brief | Produce Mark's posture brief + escalations; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Roman holds no
actuation tool. This tracer runs narrower still — **L1 propose**: it reads,
synthesizes, and parks the brief for Mark. It never delegates, sends, or writes;
containment, control changes, and identity actions remain a sub-agent's under its
own IR runbook and gauntlet. The brief is a checkpoint, not an action.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + park; voice and guardrails
come from the composed Roman persona, including audit-by-reference. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed tracer prose is `prose.md`.
