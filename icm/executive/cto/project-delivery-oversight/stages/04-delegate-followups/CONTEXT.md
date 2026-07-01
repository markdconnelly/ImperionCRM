# Stage 04 — delegate-followups

**Job:** OPTIONAL — for a grounded, cited flag, emit a proposed `delegate()` to
Pierce (recovery plan / re-sequence) or Scout (resolve the scheduling collision),
and/or a `handoff()` to Nova when cross-division, then park — Dexter never re-plans
a project, commits a date, or commits a technician.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 03 `brief.md` | the flag list | the grounded flags + owning sub-agent |
| Synthesis | stage 02 `synthesis.md` | per-flag exposure + basis | the exposure each delegate carries |

## Process

1. `[sonnet]` For each flag confirmed grounded and cited, draft the follow-up: a
   slipping project or stalled provisioning → **Pierce** (Projects — recovery plan,
   re-sequence); a capacity/scheduling collision → **Scout** (Dispatch — resolve
   the collision). Carry the project id, the account id, and the exposure (the date
   at risk) — nothing client-facing composed here.
2. `[sonnet]` Where the exposure is cross-division (a go-live tied to a sale, an
   invoice milestone, or a renewal), draft a `handoff()` to **Nova** instead,
   naming the division and the reason.
3. `[script]` Attach each delegate/handoff to the brief as a proposal and park. No
   plan edited, no date committed, no technician committed — the re-plan, the
   client-facing date, and the dispatch commitment re-gate inside the sub-agent's
   own gauntlet (ADR-0128); Pierce and Scout also answer to their own humans (Anna,
   Brandon).
4. `[script]` Any flag that is not fully grounded, or whose owner is unclear, parks
   for Luke instead of being delegated.

## Outputs

`followups.md` — the proposed `delegate()` calls to Pierce / Scout and/or
`handoff()` calls to Nova, each citing the project/account ids and the exposure;
plus any flag parked for Luke. The run ends here at the checkpoint; the recovery
and the scheduling happen inside the sub-agent, not here.

## Audit

- [ ] Every delegate names the project id, the account id, and the exposure, all grounded and cited
- [ ] Targets are correct — Pierce (recovery / re-sequence) / Scout (scheduling collision) / Nova (cross-division)
- [ ] No client-facing text is composed here — only the ask is routed
- [ ] Ungrounded or owner-unclear flags parked for Luke, never delegated
- [ ] Read-only — no plan edited, no date committed, no technician committed
- [ ] No send/write/actuation occurred — Dexter delegated or parked

## Checkpoint

The follow-ups park for **Luke**, and any delegate is a **proposal** to Pierce /
Scout; cross-division ones hand off to **Nova**. `auto` may self-approve ONLY
emitting the `delegate()` for a flagged item that is grounded and cited; the
re-plan, the client-facing date, and the technician commitment re-gate inside the
sub-agent's gauntlet (CONSTITUTION §9, ADR-0128). Dexter never actuates; any
ungrounded item parks for Luke.
