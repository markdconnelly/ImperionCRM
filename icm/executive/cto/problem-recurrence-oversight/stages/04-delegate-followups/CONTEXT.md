# Stage 04 — delegate-followups

**Job:** OPTIONAL — for a grounded, cited cluster, emit a proposed `delegate()` to
Sage (open/advance the investigation, drive the permanent fix) or Ozzie (tune the
alert pattern), and/or a `handoff()` to Nova when cross-division, then park — Dexter
never opens, closes, or works a problem himself.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 03 `brief.md` | the flag list | the grounded flags + owning sub-agent |
| Synthesis | stage 02 `synthesis.md` | per-flag burn + basis | the burn each delegate carries |

## Process

1. `[sonnet]` For each flag confirmed grounded and cited, draft the follow-up: an
   un-opened problem or a stale investigation or an overdue permanent fix →
   **Sage** (Problem Mgmt / L3); alert noise or a monitoring pattern behind the
   recurrence → **Ozzie** (NOC). Carry the cluster (CI/symptom/account), the
   problem/known-error and ticket ids, and the burn — nothing client-facing
   composed here.
2. `[sonnet]` Where the exposure is cross-division (a recurrence eroding a client
   relationship, a renewal, or a billing dispute), draft a `handoff()` to **Nova**
   instead, naming the division and the reason.
3. `[script]` Attach each delegate/handoff to the brief as a proposal and park. No
   problem opened or worked, no fix run, no monitor changed — the investigation,
   the remediation, and any production-affecting fix re-gate inside the sub-agent's
   own gauntlet (always-gated where production-affecting, ADR-0128).
4. `[script]` Any flag that is not fully grounded, or whose owner is unclear, parks
   for Luke instead of being delegated.

## Outputs

`followups.md` — the proposed `delegate()` calls to Sage / Ozzie and/or `handoff()`
calls to Nova, each citing the cluster, the ids, and the burn; plus any flag parked
for Luke. The run ends here at the checkpoint; the investigation and the fix happen
inside the sub-agent, not here.

## Audit

- [ ] Every delegate names the cluster, the problem/known-error/ticket ids, and the burn, all grounded and cited
- [ ] Targets are correct — Sage (investigation / permanent fix) / Ozzie (alert pattern) / Nova (cross-division)
- [ ] No client-facing text is composed here — only the ask is routed
- [ ] Ungrounded or owner-unclear flags parked for Luke, never delegated
- [ ] Read-only — no problem opened, advanced, or closed; no monitor touched
- [ ] No send/write/actuation occurred — Dexter delegated or parked

## Checkpoint

The follow-ups park for **Luke**, and any delegate is a **proposal** to Sage /
Ozzie; cross-division ones hand off to **Nova**. `auto` may self-approve ONLY
emitting the `delegate()` for a flagged cluster that is grounded and cited; the
investigation, the fix, and any monitor change re-gate inside the sub-agent's
gauntlet (always-gated where production-affecting, CONSTITUTION §9, ADR-0128).
Dexter never actuates; any ungrounded item parks for Luke.
