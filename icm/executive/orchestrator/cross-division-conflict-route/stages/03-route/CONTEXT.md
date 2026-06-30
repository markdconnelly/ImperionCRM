# Stage 03 — route

**Job:** act on the arbitration — `delegate` the unit to the one owner stage 02
chose (carrying every constraint), or park the decision to the owning human's
single queue — and surface the arbitration rationale. Nova routes; she does not
actuate. The route/park is the checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Arbitration | stage 02 `arbitration.md` | the single owner OR the park flag + deciding rule + pool/RLS scope + authority decision | who to hand to (or park to) and within what bounds |
| Conflict record | stage 01 `conflict.md` | intent + constraints + asking human | what to carry so the owner re-derives nothing |

## Process

1. `[script]` If stage 02 marked park-for-human (contested ownership / over-authority /
   always-gated), do **not** delegate — route the **decision** to the owning human's
   single queue (whoever owns the contested call, not automatically Derek), with the
   arbitration rationale attached.
2. `[sonnet]` Otherwise compose the delegation: the intent plus every constraint
   (consent, budget, deadline, the asking human's authority), the pool/RLS scope, and the
   arbitration rationale (which rule named this owner), so the owner inherits the full
   picture and sees why the conflict resolved to it.
3. `[script]` `delegate` the unit to **exactly one** owner (never fan one unit to
   several). Use `handoff` instead when an in-flight thread transfers wholesale.
4. `[script]` Record the delegation/handoff or the park, and surface the rationale. Nova
   actuates nothing — the owner acts under its own gauntlet; a parked decision waits on
   the human.

## Outputs

`route.md` — the owner delegated to (with the carried constraints + rationale) **or** the
decision parked to the owning human's queue (with the rationale), and the owner's returned
result reference where one comes back. The run ends here at the checkpoint; Nova actuates
nothing.

## Checkpoint

**Yes.** A human approves the route/park. In `auto`, this workflow may self-approve ONLY
a `delegate` to a single owner when stage 02 found an **unambiguous winner**, the request
is within the asking human's authority, and it stays inside one client/owner's RLS scope
(pool-never-bleed). A genuinely contested ownership, an over-authority request, or any
always-gated effect parks for the owning human. Auto never lowers the owner's gauntlet
(ADR-0128) and never actuates; anything unstated parks by default.

## Audit

- [ ] Exactly one owner delegated to, OR an explicit park to the owning human — never a guessed owner, never multiple owners for one unit
- [ ] Every constraint from intake was carried (consent/budget/deadline/authority) and the arbitration rationale surfaced
- [ ] A parked decision went to the OWNING human's queue (not defaulted to Derek)
- [ ] Most-restrictive authority bar respected; pool-never-bleed held (two-axis RLS) — no other client's/owner's data surfaced
- [ ] Nova actuated nothing — only `delegate`/`handoff` or a park (no send, write, or money move); the owner's gauntlet was not bypassed or lowered (ADR-0128)
