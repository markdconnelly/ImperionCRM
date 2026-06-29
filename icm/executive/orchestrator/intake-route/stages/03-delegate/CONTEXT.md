# Stage 03 — delegate

**Job:** hand the unit of work to exactly the one owner chosen in stage 02,
carrying every constraint — or transfer the in-flight thread via `handoff`. Nova
delegates; she does not actuate.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Route decision | stage 02 `route.md` | the single owner + pool/RLS scope + authority decision | who to hand to and within what bounds |
| Intake record | stage 01 `intake.md` | intent + constraints | what to carry so the owner re-derives nothing |

## Process

1. `[script]` If stage 02 flagged a conflict or a park (over-authority / always-
   gated), do **not** delegate — carry it to stage 04 for the owning human's queue.
2. `[sonnet]` Otherwise compose the delegation: the intent plus every constraint
   (consent, budget, deadline, the asking human's authority) and the pool/RLS scope,
   so the owner inherits the full picture.
3. `[script]` `delegate` the unit to **exactly one** owner (never fan one unit to
   several). Use `handoff` instead when an in-flight thread transfers wholesale.
4. `[script]` Record the delegation/handoff and await the owner's result. Nova
   actuates nothing here — the owner acts under its own gauntlet.

## Outputs

`delegation.md` — the owner delegated to (or the parked conflict carried forward),
the constraints handed across, and the owner's returned result reference.

## Audit

- [ ] Exactly one owner delegated to (or an explicit park/conflict carried forward) — never multiple owners for one unit
- [ ] Every constraint from intake was carried (consent/budget/deadline/authority)
- [ ] Nova actuated nothing — only `delegate`/`handoff` (no send, write, or money move)
- [ ] The owner's own gauntlet was not bypassed or lowered (ADR-0128)
