# Workflow: financial-pulse (Deputy CFO / Revenue & Finance, executive tracer)

**Job:** on a schedule, roll up AR/AP, margin, revenue, and pipeline into a
financial pulse for Nick, leading with the flags (unprofitable work, at-risk
revenue) — drafted here, never actuated.

**Trigger:** scheduled (start of the working day / week). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull finance/revenue/pipeline reads + the accounts in scope | — |
| 02 | synthesize | Roll up, rank by leakage, isolate the flags | — |
| 03 | pulse | Produce Nick's financial pulse + the flags; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Sterling holds no
actuation tool, and finance is **read-only** (QBO is the system-of-record,
ADR-0123). This tracer runs narrower still — **L1 propose**: it reads, synthesizes,
and parks the pulse for Nick. It never delegates, sends, writes a financial record,
or moves money; every customer-facing or money-moving effect remains a sub-agent's
under its own gauntlet. The pulse is a checkpoint, not an action.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + park; voice and guardrails come
from the composed Sterling persona. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed tracer prose is `prose.md`.
