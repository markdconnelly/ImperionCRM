# Stage 03 — surface

**Job:** produce Mark's governance oversight brief from the ranked flags, then
park.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Assessment | stage 02 `assessment.md` | all | the exposure-ranked flags |

## Process

1. `[sonnet]` Write the brief: a short read leading with the highest-exposure
   governance flags (a hot dial, an aging gate queue, an engaged kill-switch, a run
   anomaly), then the rest of the posture.
2. `[sonnet]` Render each flag as the brief's action surface — the posture, the
   exposure, and the **human decision it implies** (e.g. "consider dialing X back,"
   "drain the aging gate queue," "review the engaged kill-switch"). The brief
   recommends a human act; it performs none.
3. `[script]` Park the brief for Mark. No send, no delegate, no write, and no dial
   touched. Nova flips no dial, engages/releases no kill-switch, changes no policy —
   surfacing is the checkpoint.

## Outputs

`brief.md` — Mark's governance oversight brief + the ranked flag list, each item
stating the posture, the exposure, and the implied human decision. The run ends
here at the checkpoint; nothing is actuated.

## Audit

- [ ] Brief leads with the highest-exposure flags, not a tally of healthy agents
- [ ] Every flag grounded in the ledger and cited; each states the exposure and the implied human decision
- [ ] Read-only — no dial flipped, no kill-switch toggled, no policy changed, nothing actuated
- [ ] Internal posture only — no client data surfaced
- [ ] No send, delegate, or write occurred — the run parked

## Checkpoint

The brief parks for **Mark** (CISO / governance owner). `auto` may self-approve
ONLY publishing the scheduled oversight brief when every flag is grounded in the
agent-ops ledger and cited; any anomaly, gap, or recall miss parks for Mark
(CONSTITUTION §8). Flipping an autonomy dial, engaging or releasing a kill-switch,
and changing a policy are human acts (ADR-0128) — Nova observes the dial, she never
sets it; she surfaces, Mark decides.
