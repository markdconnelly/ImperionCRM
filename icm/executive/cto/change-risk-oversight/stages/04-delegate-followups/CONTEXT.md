# Stage 04 — delegate-followups

**Job:** OPTIONAL — for a grounded, cited defect, emit a proposed `delegate()` to
Marshall (re-sequence, complete the rollback plan, reclassify), and/or a `handoff()`
to Nova when cross-division, then park — Dexter never approves, schedules, or pushes
a change.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 03 `brief.md` | the flag list | the grounded defects |
| Synthesis | stage 02 `synthesis.md` | per-flag exposure + basis | the exposure each delegate carries |

## Process

1. `[sonnet]` For each defect confirmed grounded and cited, draft a **proposed**
   `delegate()` to **Marshall** (Change/Release): the change id, the defect class,
   and the ask — re-sequence out of the freeze window, complete and sign off the
   rollback plan, or reclassify the off-catalog "standard" change. The ask routes;
   the fix runs inside Marshall.
2. `[sonnet]` Where the exposure is cross-division (a client commitment, renewal,
   or billing milestone riding on the change), draft a `handoff()` to **Nova**
   instead, naming the division and the reason.
3. `[script]` Attach each delegate/handoff to the brief as a proposal and park. No
   approval, no schedule, no push — the change decision re-gates inside Marshall's
   own gauntlet, where a freeze overlap is a hard always_gate block and an approved
   rollback plan is required (ADR-0079, ADR-0128).
4. `[script]` Any flag that is not fully grounded, or whose owner is unclear, parks
   for Luke instead of being delegated.

## Outputs

`followups.md` — the proposed `delegate()` calls to Marshall and/or `handoff()`
calls to Nova, each citing the change id, the defect class, and the exposure; plus
any flag parked for Luke. The run ends here at the checkpoint; the change action
happens inside the sub-agent, not here.

## Audit

- [ ] Every delegate names the change id, the defect class, and the exposure, all grounded and cited
- [ ] The ask is remediation routing only — no approval, schedule, or push composed here
- [ ] Cross-division items are handed off to Nova, not delegated to Change/Release
- [ ] Ungrounded or owner-unclear flags parked for Luke, never delegated
- [ ] Read-only — no change approved, scheduled, or modified
- [ ] No send/write/actuation occurred — Dexter delegated or parked

## Checkpoint

The follow-ups park for **Luke**, and any delegate is a **proposal** to Marshall.
`auto` may self-approve ONLY emitting the `delegate()` to Marshall for a flagged
defect that is grounded and cited; the approval, the schedule, and the push re-gate
inside Marshall's gauntlet (always-gated, CONSTITUTION §9, ADR-0128). Dexter never
approves, schedules, or pushes a change; any ungrounded item parks for Luke.
