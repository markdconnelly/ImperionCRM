# Stage 03 — supply-chase

**Job:** park the margin intel + flag as a handoff back to Chase. Advise-only — the
block/approve is a human call.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Margin flags + intel | `margin-flags.md` (stage 02 output) | full | the intel + flags to hand back to Chase |
| Margin rubric | `./skills/margin-rubric.md` | advise-only discipline | the advise-never-block discipline |

## Process

1. `[sonnet]` Assemble the handoff back to Chase: the margin intel (historical margin,
   proposed margin, the floor) and the flag(s), each carrying its arithmetic + as-of date and
   measured-vs-derived labels. Keep it to what Audrey measured — do not advise a
   block/approve; that is a human + Chase decision.
2. `[script]` Park the handoff as an internal, reversible `operational`-class artifact for
   Chase / the cockpit. No send, no money move, no QBO push. The renewal send-for-signature
   is already `always_gate` on the Chase side (#1415) — nothing here touches it.

## Outputs

`chase-handoff.md` — the margin intel + flag(s) parked back to Chase (each with arithmetic +
as-of), plus any escalated data gap. Terminal stage; ends parked for Chase / the human.

## Audit

- [ ] Intel + flag(s) carry arithmetic + as-of date (measured vs derived labeled)
- [ ] Cost-allocation gap (#1044) carried through, not estimated
- [ ] No block/approve recommendation emitted (advise-only — human call)
- [ ] No send, posting, or QBO push emitted

## Checkpoint

The Chase / human loop: Chase and a human review the margin intel + flag and decide the
renewal block/approve; the renewal send-for-signature is already `always_gate` (Chase side,
#1415). **`auto` (L2) may self-approve parking the internal margin flag + intel back to
Chase ONLY** — there is no block, approval, posting, or money move in Audrey's catalog at any
rung (read-only ceiling, advise-only, audrey.md).
