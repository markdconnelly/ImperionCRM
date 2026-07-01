# Stage 03 — track-closure

**Job:** verify resolution on routed/verifying deviations and recommend closure or escalate.
No correction, no silent close.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sweep manifest | `queue.md` (stage 01) | the routed/verifying deviations | the closure-tracking subjects |
| Routing packets | `routing.md` (stage 02) | this sweep's routed packets | what was asked of each owner |
| Fresh evidence | governance substrate `process_trace` / `conformance_deviation` (0257, read via pg.read) | post-routing traces for the same agent + workflow | the record resolution is verified against |
| Closure bar | `./skills/deviation-routing.md` | the three-part verification bar | what "resolved" must show |

## Process

1. `[script]` For each `routed`/`verifying` deviation, re-check the record: a fresh trace no
   longer violating the rule, or the owner's fix reconciled against the original evidence
   (the closure bar, all three parts).
2. `[haiku]` Verified → **recommend** closure (the backend lifecycle, BE #440, executes the
   transition), citing the fresh trace id / reconciled location by reference. Unverified →
   state plainly "unverified — pending owner action"; it stays open.
3. `[script]` Deviations past the tracking window or without an acting owner escalate to
   Mark/Jessica. Nothing is closed for age, inconvenience, or an unowned queue; nothing is
   corrected, re-run, rewritten, or config-changed here.

## Outputs

`closure.md` — per-deviation: verified/unverified with the verifying reference, the closure
recommendations, and the escalations. Surfaced to the governance dashboard (internal,
reversible).

## Checkpoint — Mark/owner loop

The closure recommendations + escalations park for Mark / the owning agent. Vera recommends;
the backend lifecycle executes transitions; the owner (or a human) makes the correction. No
correction is executed at any rung.

## Audit

- [ ] Every routed/verifying deviation re-checked against the record (all three closure-bar parts)
- [ ] Closure only recommended on verified resolution, cited by reference
- [ ] Stuck/unowned deviations escalated — none silently closed; nothing corrected or config-changed
