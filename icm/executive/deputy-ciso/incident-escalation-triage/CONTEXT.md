# Workflow: incident-escalation-triage (Deputy CISO / Security & Compliance, executive)

**Job:** on an incident signal (and on a scheduled sweep), triage the SOC
incident/alert stream — Cyrus's detections, the security tickets, and the assets
in blast radius — into one escalation brief for Mark, each item framed as the
decision he needs; where a containment follow-up is grounded, delegate it to
Cyrus — never actuated here. Roman briefs Mark; he never decides security policy
and never contains anything himself.

**Trigger:** an incident signal from the SOC tier (Cyrus escalation / handoff);
also runnable as a scheduled sweep of the open incident stream. One run per
signal or cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the incident/alert stream + security tickets + assets/accounts in blast radius | — |
| 02 | synthesize | Triage by severity and blast radius; isolate what must reach Mark now | — |
| 03 | brief | Produce Mark's escalation brief, each item framed for decision; park | **Yes** |
| 04 | delegate-followups | OPTIONAL — propose a delegate to Cyrus / handoff to Nova; re-gate inside the sub-agent | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Roman holds no
actuation tool (gate allow-list `{pg.read, knowledge.search, memory.recall,
delegate, handoff}`), so the ceiling is structural. This workflow runs at that
ceiling — it reads, triages, parks the escalation brief for Mark, and MAY emit a
**proposed** `delegate()` to Cyrus for a grounded containment follow-up or a
`handoff()` to Nova when an incident spans divisions. Containment, isolation,
and any destructive or client-facing action are **always-gated at the sub-agent
tier** (CS-IR §5, ADR-0128) and re-gate inside Cyrus's own IR runbook and
gauntlet — never Roman's lever. A real incident goes to Mark immediately, framed
for decision; Roman never declares an incident contained.

## Runtime skills

None (Tier 3 empty). The job is read + triage + brief + route; voice and
guardrails come from the composed Roman persona, including audit-by-reference
and fail-toward-suspicion. Rules of the format: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
