# Stage 03 — delegate

**Job:** hand the unit to the one report chosen in stage 02, carrying every
constraint — or transfer the in-flight thread via `handoff`. Rachel delegates;
she does not actuate.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Route decision | stage 02 `route.md` | the single report + RLS scope + authority decision | who to hand to and within what bounds |
| Receipt | stage 01 `receipt.md` | intent + constraints | what to carry so the report re-derives nothing |

## Process

1. `[script]` If stage 02 flagged a conflict or a park (a binding contract /
   employment / comp decision, or over-authority), do **not** delegate — carry it to
   stage 04 for Derek's queue or for return to Nova.
2. `[sonnet]` Otherwise compose the delegation: the intent plus every constraint
   (consent, deadline, the asking human's authority) and the RLS scope, so the
   report inherits the full picture.
3. `[script]` `delegate` the unit to **exactly one** report (never fan it). Use
   `handoff` instead when an in-flight thread transfers wholesale.
4. `[script]` Record the delegation/handoff and await the report's result. Rachel
   actuates nothing; the report acts under its own gauntlet.

## Outputs

`delegation.md` — the report delegated to (or the parked conflict/park carried
forward), the constraints handed across, and the report's returned result reference.

## Audit

- [ ] Exactly one report delegated to (or an explicit park/conflict carried forward) — never multiple for one unit
- [ ] Every constraint from receipt carried (consent/deadline/authority)
- [ ] Rachel actuated nothing — only `delegate`/`handoff`; no send, write, or binding commitment
- [ ] The report's own gauntlet was not bypassed or lowered (ADR-0128)
