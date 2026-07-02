# Stage 04 — delegate-followups

**Job:** OPTIONAL — for a grounded, cited flag, emit a proposed `delegate()` to Felix
(triage), Sage (L3 root cause), or Scout (onsite scheduling), and/or a `handoff()` to
Nova when cross-division, then park — Dexter never touches a ticket and never
dispatches.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 03 `brief.md` | the flag list | the grounded flags + owning sub-agent |
| Synthesis | stage 02 `synthesis.md` | per-flag exposure + basis | the exposure each delegate carries |

## Process

1. `[sonnet]` For each flag confirmed grounded and cited, draft the follow-up: a
   stuck or misrouted ticket → **Felix** (triage/work the ticket); a recurring
   symptom or escalation-worthy deep issue → **Sage** (L3 root cause); a flag that
   needs hands onsite → **Scout** (scheduling). Carry the ticket id, the account id,
   and the breach/age exposure — nothing client-facing composed here.
2. `[sonnet]` Where the exposure is cross-division (a billing dispute driving the
   aging, a renewal at risk behind the backlog), draft a `handoff()` to **Nova**
   instead, naming the division and the reason.
3. `[script]` Attach each delegate/handoff to the brief as a proposal and park. No
   ticket touched, no client contacted, no technician committed — the ticket work,
   the client-facing word, and the dispatch commitment re-gate inside the sub-agent's
   own gauntlet (ADR-0128).
4. `[script]` Any flag that is not fully grounded, or whose owner is unclear, parks
   for Luke instead of being delegated.

## Outputs

`followups.md` — the proposed `delegate()` calls to Felix / Sage / Scout and/or
`handoff()` calls to Nova, each citing the ticket/account ids and the exposure; plus
any flag parked for Luke. The run ends here at the checkpoint; the ticket action
happens inside the sub-agent, not here.

## Audit

- [ ] Every delegate names the ticket id, the account id, and the breach/age exposure, all grounded and cited
- [ ] Targets are correct — Felix (triage) / Sage (L3) / Scout (scheduling) / Nova (cross-division)
- [ ] No client-facing text is composed here — only the ask is routed
- [ ] Ungrounded or owner-unclear flags parked for Luke, never delegated
- [ ] Read-only — no ticket touched, no note written, no client contacted
- [ ] No send/write/actuation occurred — Dexter delegated or parked

## Checkpoint

The follow-ups park for **Luke**, and any delegate is a **proposal** to Felix /
Sage / Scout; cross-division ones hand off to **Nova**. `auto` may self-approve ONLY
emitting the `delegate()` for a flagged item that is grounded and cited; the ticket
touch, the client-facing word, and the technician commitment re-gate inside the
sub-agent's gauntlet (always-gated where production-affecting, CONSTITUTION §9,
ADR-0128). Dexter never actuates; any ungrounded item parks for Luke.
