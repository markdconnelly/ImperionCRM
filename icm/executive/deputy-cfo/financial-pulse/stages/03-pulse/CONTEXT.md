# Stage 03 — pulse

**Job:** produce Nick's financial pulse plus the flags, then park.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Synthesis | stage 02 `synthesis.md` | all | the leakage-ranked roll-up |

## Process

1. `[sonnet]` Write the pulse: a short read leading with what's leaking
   (unprofitable work, aging AR, at-risk revenue), then the rest of the roll-up.
2. `[sonnet]` Render the flag list as the pulse's action surface — each item the
   exposure and the decision it implies for Nick.
3. `[script]` Park the pulse for Nick. No send, no delegate, no write. Finance stays
   read-only.

## Outputs

`pulse.md` — Nick's financial pulse + the flag list. The run ends here at the
checkpoint; nothing is actuated.

## Audit

- [ ] Pulse leads with flags (leakage), not a vanity revenue number
- [ ] Flag list present; each item states the exposure and the implied decision
- [ ] Read-only — no financial record written, no money moved
- [ ] No send, delegate, or write occurred — the run parked

## Checkpoint

The pulse parks for **Nick**. `auto` may self-approve ONLY publishing the scheduled
pulse when every section is grounded and cited; any flag, gap, or recall miss parks
for Nick (CONSTITUTION §8). No actuation exists at this tier — Sterling advises,
sub-agents act; finance never leaves read-only.
