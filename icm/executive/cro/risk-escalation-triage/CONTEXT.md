# Workflow: risk-escalation-triage (Chief Risk Officer / Platform & Assurance, executive)

**Job:** when risk escalations arrive — watcher quarantine flags, posture regressions,
cross-division risk signals on the handoff bus — triage them: verify grounding, rank by
severity, and route each one; brief Mark with the ranked queue, delegating observation
to the owning watcher (Vera/Tess/Alivia) where warranted. Jessica ranks and routes; she
never contains, corrects, or quarantines.

**Trigger:** on inbound escalation signal, batched; plus a scheduled sweep so nothing
sits unranked. One run per batch/cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the open escalations + their posture/account context and prior activity | — |
| 02 | synthesize | Verify grounding, severity-rank, split verified vs suspected, mark quarantine candidates | — |
| 03 | brief | Produce Mark's ranked escalation queue + the critical flags; park | **Yes** |
| 04 | delegate-followups | Emit a proposed delegate to the owning watcher / handoff to Nova; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): the executive tier grants
no actuation tool, and the assurance line **never holds the levers it audits**
(`../room.md`). This workflow runs at that ceiling — it reads, triages, parks the
ranked queue for Mark, and may emit a **proposed** `delegate()` to the owning watcher
for grounded observation or a `handoff()` to Nova when the escalation belongs to
another division. A **critical-severity finding always parks for Mark regardless of
grounding** — speed of routing never substitutes for his call. Quarantine, containment,
correction, and governance changes are always-gated to Mark. Delegate and handoff route
work — they do not actuate.

## Runtime skills

None (Tier 3 empty). The job is read + triage + brief + route; voice, independence,
and audit-by-reference come from the composed Jessica persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
