# Workflow: conformance-drift-oversight (Chief Risk Officer / Platform & Assurance, executive)

**Job:** on a schedule, roll platform-conformance and control-drift signals — autonomy-dial
changes, budget/ceiling drift, gate failures — into a conformance brief for Mark, leading
with the highest-risk drift and the quarantine candidates, and where a drift finding is
grounded, delegate the *verification* to Vera. Jessica never applies the fix she flags.

**Trigger:** scheduled (start of the working day / week). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the dial state, Vera's run-ledger / handoff signals, and the conformance reads | — |
| 02 | synthesize | Rank by drift risk, split verified vs suspected, isolate quarantine candidates | — |
| 03 | brief | Produce Mark's conformance brief + the drift/quarantine flags; park | **Yes** |
| 04 | delegate-followups | Emit a proposed delegate to Vera (observation only) / handoff to Nova; park | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): the executive tier grants
no actuation tool, and the assurance line **never holds the levers it audits** (the Vera
doctrine — `../room.md`). This workflow runs at that ceiling — it reads, synthesizes,
parks the brief for Mark, and may emit a **proposed** `delegate()` to Vera for grounded
drift *verification* (observation, never correction) or a `handoff()` to Nova when the
drift is cross-division. Every correction, autonomy-dial change, governance-config
change, and control ratification is always-gated to Mark. Delegate and handoff route
work — they do not actuate.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice, independence,
and audit-by-reference come from the composed Jessica persona. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
